-- ============================================================
-- MyTO — log time off on a manual (unsigned-up) partner's behalf
--
-- Manual mode already lets the real household member log THEIR OWN time
-- off, auto-approved, crediting the invisible partner (pto_transactions
-- .user_id = null). This adds the reverse: the real member can also say
-- "my partner was off duty" — initiated_by = null (representing the
-- manual partner), user_id = auth.uid() (the real member banks the
-- credit, since they're the one who covered). Both directions auto-
-- approve, same as today, since there's nobody else in a manual household
-- to check anything.
--
-- initiated_by has been nullable since 0004 (account-deletion detach), so
-- no column change is needed — this migration is RPC-only.
--
-- Also fixes an ownership-check bug in cancel_pto_series /
-- reschedule_pto_series: both explicitly REJECT a null initiated_by
-- ("is null or initiated_by != auth.uid()"), which would have locked the
-- real member out of managing their own for-partner series the moment
-- this feature shipped. edit_pto_request / cancel_pto_request already
-- pass through a null initiated_by correctly (PL/pgSQL treats a NULL IF
-- condition as false), so they're left logically alone, just rewritten
-- to check explicitly instead of relying on that implicit behavior.
--
-- Run this in the Supabase SQL Editor after 0008.
-- ============================================================

-- ============================================================
-- create_pto_request — adds p_for_partner. Trailing default param, so
-- existing call sites (positional, 5 args) keep working unchanged.
-- ============================================================
create or replace function public.create_pto_request(
  p_title text,
  p_off_duty_start timestamptz,
  p_back_on_duty timestamptz,
  p_category text,
  p_note text default null,
  p_for_partner boolean default false
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
  if p_category not in ('day', 'morning', 'afternoon', 'evening') then
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
      -- The manual partner was off duty; the real member covered, so they're credited.
      v_initiated_by := null;
      v_credited_to := auth.uid();
    else
      -- The real member was off duty; the manual partner banks the credit.
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

  v_weight := public.category_weight(v_household, p_category);
  v_base_hours := round(extract(epoch from (p_back_on_duty - p_off_duty_start)) / 3600, 2);

  insert into public.pto_transactions (
    household_id, user_id, initiated_by, transaction_type,
    title, category, base_hours, multiplier, final_cost, status, note, occurred_at
  ) values (
    v_household_id, v_credited_to, v_initiated_by, 'request',
    trim(p_title), p_category, v_base_hours, 1.0, v_weight, v_status, p_note, p_off_duty_start
  ) returning * into v_txn;

  if v_status = 'approved' then
    update public.pto_balances
    set current_balance = current_balance + v_weight, updated_at = now()
    where household_id = v_household_id and user_id is not distinct from v_credited_to;
  end if;

  return v_txn;
end;
$$;

-- ============================================================
-- create_recurring_pto_request — same p_for_partner addition.
-- ============================================================
create or replace function public.create_recurring_pto_request(
  p_title text,
  p_first_off_duty_start timestamptz,
  p_first_back_on_duty timestamptz,
  p_category text,
  p_frequency text,
  p_ends_by timestamptz,
  p_note text default null,
  p_for_partner boolean default false
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
  v_weight := public.category_weight(v_household, p_category);

  loop
    v_start := p_first_off_duty_start + (v_n * v_step);
    exit when v_start > p_ends_by or v_n >= 52;

    insert into public.pto_transactions (
      household_id, user_id, initiated_by, transaction_type,
      title, category, base_hours, multiplier, final_cost, status, note, occurred_at, series_id
    ) values (
      v_household_id, v_credited_to, v_initiated_by, 'request',
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
    where household_id = v_household_id and user_id is not distinct from v_credited_to;
  end if;

  return v_n;
end;
$$;

-- ============================================================
-- edit_pto_request — explicit null-tolerant ownership check (was already
-- correct by implicit NULL-in-IF behavior; made explicit for clarity).
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
  if v_txn.initiated_by is not null and v_txn.initiated_by != auth.uid() then
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

-- ============================================================
-- cancel_pto_request — same explicit null-tolerant ownership check.
-- ============================================================
create or replace function public.cancel_pto_request(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_txn public.pto_transactions;
begin
  select * into v_txn from public.pto_transactions where id = p_transaction_id for update;
  if v_txn is null then
    raise exception 'NOT_FOUND: no such request';
  end if;
  if v_txn.household_id != public.current_household_id() then
    raise exception 'FORBIDDEN: not your household';
  end if;
  if v_txn.initiated_by is not null and v_txn.initiated_by != auth.uid() then
    raise exception 'NOT_YOURS: only the person who made a request can cancel it';
  end if;
  if v_txn.status = 'cancelled' then
    raise exception 'ALREADY_CANCELLED: this request is already cancelled';
  end if;

  if v_txn.status = 'approved' then
    update public.pto_balances
    set current_balance = current_balance - v_txn.final_cost, updated_at = now()
    where household_id = v_txn.household_id and user_id is not distinct from v_txn.user_id;
  end if;

  update public.pto_transactions set status = 'cancelled' where id = p_transaction_id;
end;
$$;

-- ============================================================
-- cancel_pto_series — BUG FIX: the old check explicitly rejected a null
-- initiated_by, which would block managing a for-partner series entirely.
-- ============================================================
create or replace function public.cancel_pto_series(p_series_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_initiated_by uuid;
  v_user_id uuid;
  v_reverse numeric(10,2);
  v_count integer;
begin
  select household_id, initiated_by, user_id
    into v_household_id, v_initiated_by, v_user_id
  from public.pto_transactions where series_id = p_series_id limit 1;

  if v_household_id is null then
    raise exception 'NOT_FOUND: no such series';
  end if;
  if v_household_id != public.current_household_id() then
    raise exception 'FORBIDDEN: not your household';
  end if;
  if v_initiated_by is not null and v_initiated_by != auth.uid() then
    raise exception 'NOT_YOURS: only the person who made a series can cancel it';
  end if;

  select coalesce(sum(final_cost), 0) into v_reverse
  from public.pto_transactions
  where series_id = p_series_id and status = 'approved' and occurred_at > now();

  update public.pto_transactions set status = 'cancelled'
  where series_id = p_series_id
    and status in ('pending', 'approved')
    and occurred_at > now();

  get diagnostics v_count = row_count;

  if v_reverse > 0 then
    update public.pto_balances
    set current_balance = current_balance - v_reverse, updated_at = now()
    where household_id = v_household_id and user_id is not distinct from v_user_id;
  end if;

  return v_count;
end;
$$;

-- ============================================================
-- reschedule_pto_series — same bug fix.
-- ============================================================
create or replace function public.reschedule_pto_series(p_series_id uuid, p_shift_days integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_initiated_by uuid;
  v_count integer;
begin
  if p_shift_days = 0 then
    return 0;
  end if;

  select household_id, initiated_by into v_household_id, v_initiated_by
  from public.pto_transactions where series_id = p_series_id limit 1;

  if v_household_id is null then
    raise exception 'NOT_FOUND: no such series';
  end if;
  if v_household_id != public.current_household_id() then
    raise exception 'FORBIDDEN: not your household';
  end if;
  if v_initiated_by is not null and v_initiated_by != auth.uid() then
    raise exception 'NOT_YOURS: only the person who made a series can reschedule it';
  end if;

  update public.pto_transactions
  set occurred_at = occurred_at + (p_shift_days || ' days')::interval
  where series_id = p_series_id
    and status in ('pending', 'approved')
    and occurred_at > now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
