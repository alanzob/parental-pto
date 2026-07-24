-- ============================================================
-- MyTO — self-described custom-credit requests
--
-- Adds a fifth category, 'custom', alongside day/morning/afternoon/evening/
-- trip. Instead of banking a household-configured weight, a custom request
-- carries its own user-chosen point value (e.g. "Weekend Golfing" = 1.5,
-- "Full day away (coverage provided)" = 2) — the request's title already
-- doubles as its description, so no new field was needed there.
--
-- Reuses the 'day' category's nominal [8,22) window for calendar/ICS
-- placement, same as a full day off — custom entries are open-ended, not
-- tied to a specific morning/afternoon/evening slot.
--
-- Run this in the Supabase SQL Editor after 0012.
-- ============================================================

alter table public.pto_transactions
  add column if not exists custom_weight numeric(8,2);

alter table public.pto_transactions drop constraint if exists pto_transactions_category_check;
alter table public.pto_transactions add constraint pto_transactions_category_check
  check (category in ('day', 'morning', 'afternoon', 'evening', 'trip', 'custom'));

-- request_weight gains p_custom_weight (trailing default, existing 5-arg
-- call sites unaffected). 'custom' bypasses category_weight/trip_weight
-- entirely and returns the caller-supplied value.
create or replace function public.request_weight(
  h public.households,
  p_category text,
  p_departure_date date,
  p_return_date date,
  p_departure_period text,
  p_return_period text,
  p_custom_weight numeric default null
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
  if p_category = 'custom' then
    if p_custom_weight is null or p_custom_weight <= 0 then
      raise exception 'INVALID_CUSTOM_WEIGHT: give this a positive number of credits';
    end if;
    return p_custom_weight;
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
  p_return_date date default null,
  p_custom_weight numeric default null
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
  if p_category not in ('day', 'morning', 'afternoon', 'evening', 'trip', 'custom') then
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

  v_weight := public.request_weight(v_household, p_category, p_departure_date, p_return_date, p_departure_period, p_return_period, p_custom_weight);
  v_base_hours := round(extract(epoch from (p_back_on_duty - p_off_duty_start)) / 3600, 2);

  insert into public.pto_transactions (
    household_id, user_id, initiated_by, transaction_type,
    title, category, base_hours, multiplier, final_cost, status, note, occurred_at,
    departure_period, return_period, custom_weight
  ) values (
    v_household_id, v_credited_to, v_initiated_by, 'request',
    trim(p_title), p_category, v_base_hours, 1.0, v_weight, v_status, p_note, p_off_duty_start,
    p_departure_period, p_return_period, case when p_category = 'custom' then p_custom_weight else null end
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
  p_return_date date default null,
  p_custom_weight numeric default null
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
  v_new_custom_weight numeric(8,2);
begin
  if p_title is null or trim(p_title) = '' then
    raise exception 'INVALID_TITLE: give this request a name';
  end if;
  if p_category not in ('day', 'morning', 'afternoon', 'evening', 'trip', 'custom') then
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
  v_weight := public.request_weight(v_household, p_category, p_departure_date, p_return_date, p_departure_period, p_return_period, p_custom_weight);
  v_base_hours := round(extract(epoch from (p_back_on_duty - p_off_duty_start)) / 3600, 2);
  v_new_custom_weight := case when p_category = 'custom' then p_custom_weight else null end;

  v_content_changed :=
    v_txn.category is distinct from p_category
    or v_txn.occurred_at is distinct from p_off_duty_start
    or v_txn.base_hours is distinct from v_base_hours
    or v_txn.departure_period is distinct from p_departure_period
    or v_txn.return_period is distinct from p_return_period
    or v_txn.custom_weight is distinct from v_new_custom_weight;

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
      custom_weight = v_new_custom_weight,
      note = p_note,
      status = v_new_status
  where id = p_transaction_id
  returning * into v_txn;

  return v_txn;
end;
$$;

-- create_recurring_pto_request never supported trips (repeat is one-off-only
-- there already), so it gets a simpler custom branch inline rather than
-- going through request_weight/trip_weight.
create or replace function public.create_recurring_pto_request(
  p_title text,
  p_first_off_duty_start timestamptz,
  p_first_back_on_duty timestamptz,
  p_category text,
  p_frequency text,
  p_ends_by timestamptz,
  p_note text default null,
  p_for_partner boolean default false,
  p_custom_weight numeric default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_household public.households;
  v_partner_id uuid;
  v_status text;
  v_series_id uuid := gen_random_uuid();
  v_step interval;
  v_duration interval;
  v_weight numeric(8,2);
  v_base_hours numeric(6,2);
  v_start timestamptz;
  v_credit_total numeric(10,2) := 0;
  v_n integer := 0;
  v_initiated_by uuid;
  v_credited_to uuid;
begin
  if p_title is null or trim(p_title) = '' then
    raise exception 'INVALID_TITLE: give this request a name';
  end if;
  if p_category not in ('day', 'morning', 'afternoon', 'evening', 'custom') then
    raise exception 'INVALID_CATEGORY: pick a time-off category';
  end if;
  if p_category = 'custom' and (p_custom_weight is null or p_custom_weight <= 0) then
    raise exception 'INVALID_CUSTOM_WEIGHT: give this a positive number of credits';
  end if;
  if p_frequency not in ('daily', 'weekly', 'monthly') then
    raise exception 'INVALID_FREQUENCY: repeat must be daily, weekly, or monthly';
  end if;
  if p_ends_by < p_first_off_duty_start then
    raise exception 'INVALID_END: the end date is before the first occurrence';
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

  v_step := case p_frequency
    when 'daily' then interval '1 day'
    when 'weekly' then interval '1 week'
    when 'monthly' then interval '1 month'
  end;
  v_duration := p_first_back_on_duty - p_first_off_duty_start;
  v_base_hours := round(extract(epoch from v_duration) / 3600, 2);
  v_weight := case when p_category = 'custom' then p_custom_weight else public.category_weight(v_household, p_category) end;

  loop
    v_start := p_first_off_duty_start + (v_n * v_step);
    exit when v_start > p_ends_by or v_n >= 52;

    insert into public.pto_transactions (
      household_id, user_id, initiated_by, transaction_type,
      title, category, base_hours, multiplier, final_cost, status, note, occurred_at, series_id, custom_weight
    ) values (
      v_household_id, v_credited_to, v_initiated_by, 'request',
      trim(p_title), p_category, v_base_hours, 1.0, v_weight, v_status, p_note, v_start, v_series_id,
      case when p_category = 'custom' then p_custom_weight else null end
    );

    if v_status = 'approved' then
      v_credit_total := v_credit_total + v_weight;
    end if;
    v_n := v_n + 1;
  end loop;

  if v_n = 0 then
    raise exception 'INVALID_END: no occurrences fall on or before the end date';
  end if;

  if v_credit_total > 0 then
    update public.pto_balances
    set current_balance = current_balance + v_credit_total, updated_at = now()
    where household_id = v_household_id and user_id is not distinct from v_credited_to;
  end if;

  return v_n;
end;
$$;
