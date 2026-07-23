-- ============================================================
-- MyTO — switch from hours to weighted time-off categories
--
-- A request is now a date + one of four categories (day / morning /
-- afternoon / evening off). Each banks its household-configured WEIGHT in
-- points, replacing the old hours × peak-multiplier math. Balances are now
-- point totals. The peak-window multiplier is retired (its columns stay on
-- households, unused, rather than being dropped).
--
-- pto_transactions keeps occurred_at + base_hours populated from the
-- category's nominal daily window so the ICS feed still has real event
-- times; final_cost now holds the category weight (the credited points),
-- and a new `category` column drives calendar rendering.
--
-- Run this in the Supabase SQL Editor after 0007.
-- ============================================================

alter table public.households
  add column if not exists category_weight_day numeric(5,2) not null default 3,
  add column if not exists category_weight_morning numeric(5,2) not null default 1,
  add column if not exists category_weight_afternoon numeric(5,2) not null default 1,
  add column if not exists category_weight_evening numeric(5,2) not null default 1;

alter table public.pto_transactions
  add column if not exists category text
    check (category in ('day', 'morning', 'afternoon', 'evening'));

-- Old signatures go; new ones take p_category.
drop function if exists public.create_pto_request(text, timestamptz, timestamptz, text);
drop function if exists public.create_recurring_pto_request(text, timestamptz, timestamptz, text, timestamptz, text);
drop function if exists public.edit_pto_request(uuid, timestamptz, timestamptz, text);

-- Resolve a category to its household weight.
create or replace function public.category_weight(h public.households, p_category text)
returns numeric
language sql
immutable
as $$
  select case p_category
    when 'day' then h.category_weight_day
    when 'morning' then h.category_weight_morning
    when 'afternoon' then h.category_weight_afternoon
    when 'evening' then h.category_weight_evening
  end;
$$;

-- ============================================================
-- create_pto_request — date + category. Credits the category weight
-- (points). Pending in invited mode; auto-approved + credited in manual.
-- ============================================================
create or replace function public.create_pto_request(
  p_title text,
  p_off_duty_start timestamptz,
  p_back_on_duty timestamptz,
  p_category text,
  p_note text default null
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
begin
  if p_title is null or trim(p_title) = '' then
    raise exception 'INVALID_TITLE: give this request a name';
  end if;
  if p_category not in ('day', 'morning', 'afternoon', 'evening') then
    raise exception 'INVALID_CATEGORY: pick a time-off category';
  end if;

  select household_id into v_household_id from public.profiles where id = auth.uid();
  if v_household_id is null then
    raise exception 'NO_HOUSEHOLD: you must belong to a household';
  end if;
  select * into v_household from public.households where id = v_household_id;

  if v_household.partner_mode = 'manual' then
    v_partner_id := null;
    v_status := 'approved';
  else
    select id into v_partner_id
    from public.profiles
    where household_id = v_household_id and id != auth.uid()
    limit 1;
    if v_partner_id is null then
      raise exception 'NO_PARTNER: invite your partner before requesting time off';
    end if;
    v_status := 'pending';
  end if;

  v_weight := public.category_weight(v_household, p_category);
  v_base_hours := round(extract(epoch from (p_back_on_duty - p_off_duty_start)) / 3600, 2);

  insert into public.pto_transactions (
    household_id, user_id, initiated_by, transaction_type,
    title, category, base_hours, multiplier, final_cost, status, note, occurred_at
  ) values (
    v_household_id, v_partner_id, auth.uid(), 'request',
    trim(p_title), p_category, v_base_hours, 1.0, v_weight, v_status, p_note, p_off_duty_start
  ) returning * into v_txn;

  if v_status = 'approved' then
    update public.pto_balances
    set current_balance = current_balance + v_weight, updated_at = now()
    where household_id = v_household_id and user_id is null;
  end if;

  return v_txn;
end;
$$;

-- ============================================================
-- create_recurring_pto_request — same category on a cadence.
-- ============================================================
create or replace function public.create_recurring_pto_request(
  p_title text,
  p_first_off_duty_start timestamptz,
  p_first_back_on_duty timestamptz,
  p_category text,
  p_frequency text,
  p_ends_by timestamptz,
  p_note text default null
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
begin
  if p_title is null or trim(p_title) = '' then
    raise exception 'INVALID_TITLE: give this request a name';
  end if;
  if p_category not in ('day', 'morning', 'afternoon', 'evening') then
    raise exception 'INVALID_CATEGORY: pick a time-off category';
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

  if v_household.partner_mode = 'manual' then
    v_partner_id := null;
    v_status := 'approved';
  else
    select id into v_partner_id
    from public.profiles
    where household_id = v_household_id and id != auth.uid()
    limit 1;
    if v_partner_id is null then
      raise exception 'NO_PARTNER: invite your partner before requesting time off';
    end if;
    v_status := 'pending';
  end if;

  v_step := case p_frequency
    when 'daily' then interval '1 day'
    when 'weekly' then interval '1 week'
    when 'monthly' then interval '1 month'
  end;
  v_duration := p_first_back_on_duty - p_first_off_duty_start;
  v_base_hours := round(extract(epoch from v_duration) / 3600, 2);
  v_weight := public.category_weight(v_household, p_category);

  loop
    v_start := p_first_off_duty_start + (v_n * v_step);
    exit when v_start > p_ends_by or v_n >= 52;

    insert into public.pto_transactions (
      household_id, user_id, initiated_by, transaction_type,
      title, category, base_hours, multiplier, final_cost, status, note, occurred_at, series_id
    ) values (
      v_household_id, v_partner_id, auth.uid(), 'request',
      trim(p_title), p_category, v_base_hours, 1.0, v_weight, v_status, p_note, v_start, v_series_id
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
    where household_id = v_household_id and user_id is null;
  end if;

  return v_n;
end;
$$;

-- ============================================================
-- edit_pto_request — change the date and/or category. Re-approve on edit:
-- an approved request in invited mode reverses its credit and drops back to
-- pending; in manual mode the balance is adjusted by the delta and it stays
-- approved.
-- ============================================================
create or replace function public.edit_pto_request(
  p_transaction_id uuid,
  p_off_duty_start timestamptz,
  p_back_on_duty timestamptz,
  p_category text,
  p_note text default null
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
begin
  if p_category not in ('day', 'morning', 'afternoon', 'evening') then
    raise exception 'INVALID_CATEGORY: pick a time-off category';
  end if;

  select * into v_txn from public.pto_transactions where id = p_transaction_id for update;
  if v_txn is null then
    raise exception 'NOT_FOUND: no such request';
  end if;
  if v_txn.household_id != public.current_household_id() then
    raise exception 'FORBIDDEN: not your household';
  end if;
  if v_txn.initiated_by != auth.uid() then
    raise exception 'NOT_YOURS: only the person who made a request can edit it';
  end if;
  if v_txn.status not in ('pending', 'approved') then
    raise exception 'RESOLVED: only pending or approved requests can be edited';
  end if;

  select * into v_household from public.households where id = v_txn.household_id;
  v_weight := public.category_weight(v_household, p_category);
  v_base_hours := round(extract(epoch from (p_back_on_duty - p_off_duty_start)) / 3600, 2);

  v_new_status := v_txn.status;

  if v_txn.status = 'approved' then
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
  set occurred_at = p_off_duty_start,
      category = p_category,
      base_hours = v_base_hours,
      multiplier = 1.0,
      final_cost = v_weight,
      note = p_note,
      status = v_new_status
  where id = p_transaction_id
  returning * into v_txn;

  return v_txn;
end;
$$;
