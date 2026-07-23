-- ============================================================
-- MyTO — fix trip credit miscalculation from a timezone mismatch
--
-- Bug: trip_weight (0011) derived the departure/return calendar dates by
-- taking the stored timestamptz and converting "at time zone
-- h.timezone". But the CLIENT builds those timestamps from the
-- browser's own local wall-clock time — completely unrelated to
-- household.timezone, which is just a Settings field (default 'UTC')
-- that most households never touch. Whenever the two disagreed (e.g. a
-- browser in US Eastern with a household still on the UTC default), the
-- return timestamp's UTC instant could land on the wrong calendar day
-- once reinterpreted in the household's timezone, silently adding or
-- removing a full day's credit. Confirmed on production: an Aug 2 (eve)
-- -> Aug 4 (eve) trip that should cost 7 pts (1 departure + 3 middle +
-- 3 return) was stored as 10 — the return date was miscomputed as Aug 5,
-- adding a phantom middle day.
--
-- Fix: stop deriving dates from timestamps entirely for trip math. The
-- client already has the plain departure/return calendar dates the user
-- picked (unambiguous 'date' values, no timezone conversion needed) —
-- pass them straight through instead.
--
-- Run this in the Supabase SQL Editor after 0011.
-- ============================================================

-- trip_weight/request_weight change parameter TYPES (not just append
-- trailing defaults like create_pto_request/edit_pto_request below), so
-- CREATE OR REPLACE would create a second overload instead of replacing
-- the 0011 version — drop the old signatures explicitly first.
drop function if exists public.trip_weight(public.households, timestamptz, timestamptz, text, text);
drop function if exists public.request_weight(public.households, text, timestamptz, timestamptz, text, text);

create or replace function public.trip_weight(
  h public.households,
  p_departure_date date,
  p_return_date date,
  p_departure_period text,
  p_return_period text
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_middle_days integer := greatest(0, (p_return_date - p_departure_date) - 1);
  v_departure_credit numeric;
  v_return_credit numeric;
begin
  v_departure_credit := case p_departure_period
    when 'morning' then h.category_weight_day
    when 'afternoon' then h.category_weight_afternoon + h.category_weight_evening
    when 'evening' then h.category_weight_evening
  end;
  v_return_credit := case p_return_period
    when 'morning' then h.category_weight_morning
    when 'afternoon' then h.category_weight_morning + h.category_weight_afternoon
    when 'evening' then h.category_weight_day
  end;
  return v_departure_credit + (v_middle_days * h.category_weight_day) + v_return_credit;
end;
$$;

create or replace function public.request_weight(
  h public.households,
  p_category text,
  p_departure_date date,
  p_return_date date,
  p_departure_period text,
  p_return_period text
)
returns numeric
language plpgsql
immutable
as $$
begin
  if p_category = 'trip' then
    if p_departure_period is null or p_return_period is null
       or p_departure_date is null or p_return_date is null then
      raise exception 'INVALID_TRIP: a trip needs departure/return dates and times of day';
    end if;
    return public.trip_weight(h, p_departure_date, p_return_date, p_departure_period, p_return_period);
  end if;
  return public.category_weight(h, p_category);
end;
$$;

create or replace function public.create_pto_request(
  p_title text,
  p_off_duty_start timestamptz,
  p_back_on_duty timestamptz,
  p_category text,
  p_note text default null,
  p_for_partner boolean default false,
  p_departure_period text default null,
  p_return_period text default null,
  p_departure_date date default null,
  p_return_date date default null
)
returns public.pto_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_household public.households;
  v_partner_id uuid;
  v_status text;
  v_weight numeric(8,2);
  v_base_hours numeric(6,2);
  v_txn public.pto_transactions;
  v_initiated_by uuid;
  v_credited_to uuid;
begin
  if p_title is null or trim(p_title) = '' then
    raise exception 'INVALID_TITLE: give this request a name';
  end if;
  if p_category not in ('day', 'morning', 'afternoon', 'evening', 'trip') then
    raise exception 'INVALID_CATEGORY: pick a time-off category';
  end if;

  select household_id into v_household_id from public.profiles where id = auth.uid();
  if v_household_id is null then
    raise exception 'NO_HOUSEHOLD: you must belong to a household';
  end if;
  select * into v_household from public.households where id = v_household_id;

  if p_for_partner and v_household.partner_mode != 'manual' then
    raise exception 'INVALID_FOR_PARTNER: only a manual-partner household can log on their behalf';
  end if;

  if v_household.partner_mode = 'manual' then
    v_status := 'approved';
    if p_for_partner then
      v_initiated_by := null;
      v_credited_to := auth.uid();
    else
      v_initiated_by := auth.uid();
      v_credited_to := null;
    end if;
  else
    select id into v_partner_id
    from public.profiles
    where household_id = v_household_id and id != auth.uid()
    limit 1;
    if v_partner_id is null then
      raise exception 'NO_PARTNER: invite your partner before requesting time off';
    end if;
    v_status := 'pending';
    v_initiated_by := auth.uid();
    v_credited_to := v_partner_id;
  end if;

  v_weight := public.request_weight(v_household, p_category, p_departure_date, p_return_date, p_departure_period, p_return_period);
  v_base_hours := round(extract(epoch from (p_back_on_duty - p_off_duty_start)) / 3600, 2);

  insert into public.pto_transactions (
    household_id, user_id, initiated_by, transaction_type,
    title, category, base_hours, multiplier, final_cost, status, note, occurred_at,
    departure_period, return_period
  ) values (
    v_household_id, v_credited_to, v_initiated_by, 'request',
    trim(p_title), p_category, v_base_hours, 1.0, v_weight, v_status, p_note, p_off_duty_start,
    p_departure_period, p_return_period
  ) returning * into v_txn;

  if v_status = 'approved' then
    update public.pto_balances
    set current_balance = current_balance + v_weight, updated_at = now()
    where household_id = v_household_id and user_id is not distinct from v_credited_to;
  end if;

  return v_txn;
end;
$$;

create or replace function public.edit_pto_request(
  p_transaction_id uuid,
  p_title text,
  p_off_duty_start timestamptz,
  p_back_on_duty timestamptz,
  p_category text,
  p_note text default null,
  p_departure_period text default null,
  p_return_period text default null,
  p_departure_date date default null,
  p_return_date date default null
)
returns public.pto_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_txn public.pto_transactions;
  v_household public.households;
  v_weight numeric(8,2);
  v_base_hours numeric(6,2);
  v_new_status text;
  v_content_changed boolean;
begin
  if p_title is null or trim(p_title) = '' then
    raise exception 'INVALID_TITLE: give this request a name';
  end if;
  if p_category not in ('day', 'morning', 'afternoon', 'evening', 'trip') then
    raise exception 'INVALID_CATEGORY: pick a time-off category';
  end if;

  select * into v_txn from public.pto_transactions where id = p_transaction_id for update;
  if v_txn is null then
    raise exception 'NOT_FOUND: no such request';
  end if;
  if v_txn.household_id != public.current_household_id() then
    raise exception 'FORBIDDEN: not your household';
  end if;
  if v_txn.initiated_by is not null and v_txn.initiated_by != auth.uid() then
    raise exception 'NOT_YOURS: only the person who made a request can edit it';
  end if;
  if v_txn.status not in ('pending', 'approved') then
    raise exception 'RESOLVED: only pending or approved requests can be edited';
  end if;

  select * into v_household from public.households where id = v_txn.household_id;
  v_weight := public.request_weight(v_household, p_category, p_departure_date, p_return_date, p_departure_period, p_return_period);
  v_base_hours := round(extract(epoch from (p_back_on_duty - p_off_duty_start)) / 3600, 2);

  v_content_changed :=
    v_txn.category is distinct from p_category
    or v_txn.occurred_at is distinct from p_off_duty_start
    or v_txn.base_hours is distinct from v_base_hours
    or v_txn.departure_period is distinct from p_departure_period
    or v_txn.return_period is distinct from p_return_period;

  v_new_status := v_txn.status;

  if v_content_changed and v_txn.status = 'approved' then
    if v_household.partner_mode = 'manual' then
      update public.pto_balances
      set current_balance = current_balance - v_txn.final_cost + v_weight, updated_at = now()
      where household_id = v_txn.household_id and user_id is not distinct from v_txn.user_id;
    else
      update public.pto_balances
      set current_balance = current_balance - v_txn.final_cost, updated_at = now()
      where household_id = v_txn.household_id and user_id is not distinct from v_txn.user_id;
      v_new_status := 'pending';
    end if;
  end if;

  update public.pto_transactions
  set title = trim(p_title),
      occurred_at = p_off_duty_start,
      category = p_category,
      base_hours = v_base_hours,
      multiplier = 1.0,
      final_cost = case when v_content_changed then v_weight else v_txn.final_cost end,
      departure_period = p_departure_period,
      return_period = p_return_period,
      note = p_note,
      status = v_new_status
  where id = p_transaction_id
  returning * into v_txn;

  return v_txn;
end;
$$;
