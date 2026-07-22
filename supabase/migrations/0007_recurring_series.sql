-- ============================================================
-- Parental PTO — recurring request series
--
-- Generates a batch of linked requests (shared series_id, from 0006) on a
-- daily / weekly / monthly cadence up to an "ends by" date, then lets the
-- pair act on the whole series at once:
--   * respond_pto_series   — partner approves or denies the batch in one go
--   * cancel_pto_series    — requester cancels all remaining (future) ones
--   * reschedule_pto_series — requester shifts remaining ones by N days
--
-- Balance targeting again uses `user_id is not distinct from ...` so it
-- works whether the credited partner is real (uuid) or manual (null).
-- Shift-by-days deliberately preserves each instance's time-of-day, so the
-- peak multiplier and credited hours never change — no re-approval needed.
--
-- Run this in the Supabase SQL Editor after 0006.
-- ============================================================

-- ============================================================
-- RPC: create_recurring_pto_request — one dialog submission, many linked
-- requests. Pending in invited mode; auto-approved + credited in manual
-- mode. Capped at 52 instances. Returns the number generated.
-- ============================================================
create or replace function public.create_recurring_pto_request(
  p_title text,
  p_first_off_duty_start timestamptz,
  p_first_back_on_duty timestamptz,
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
  v_start timestamptz;
  v_end timestamptz;
  v_local_time time;
  v_multiplier numeric(4,2);
  v_base_hours numeric(6,2);
  v_final_cost numeric(8,2);
  v_credit_total numeric(10,2) := 0;
  v_n integer := 0;
begin
  if p_title is null or trim(p_title) = '' then
    raise exception 'INVALID_TITLE: give this request a name';
  end if;
  if p_first_back_on_duty <= p_first_off_duty_start then
    raise exception 'INVALID_WINDOW: back-on-duty must be after off-duty-start';
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

  loop
    v_start := p_first_off_duty_start + (v_n * v_step);
    exit when v_start > p_ends_by or v_n >= 52;
    v_end := v_start + v_duration;

    v_multiplier := 1.0;
    v_local_time := (v_start at time zone v_household.timezone)::time;
    if v_local_time >= v_household.peak_window_start and v_local_time < v_household.peak_window_end then
      v_multiplier := v_household.peak_multiplier;
    end if;
    v_final_cost := round(v_base_hours * v_multiplier, 2);

    insert into public.pto_transactions (
      household_id, user_id, initiated_by, transaction_type,
      title, base_hours, multiplier, final_cost, status, note, occurred_at, series_id
    ) values (
      v_household_id, v_partner_id, auth.uid(), 'request',
      trim(p_title), v_base_hours, v_multiplier, v_final_cost, v_status, p_note, v_start, v_series_id
    );

    if v_status = 'approved' then
      v_credit_total := v_credit_total + v_final_cost;
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
-- RPC: respond_pto_series — the credited partner approves or denies every
-- still-pending instance in a series at once. Approving credits the sum.
-- ============================================================
create or replace function public.respond_pto_series(p_series_id uuid, p_approve boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_user_id uuid;
  v_sum numeric(10,2);
  v_count integer;
begin
  select household_id, user_id into v_household_id, v_user_id
  from public.pto_transactions where series_id = p_series_id limit 1;

  if v_household_id is null then
    raise exception 'NOT_FOUND: no such series';
  end if;
  if v_household_id != public.current_household_id() then
    raise exception 'FORBIDDEN: not your household';
  end if;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'SELF_APPROVAL_BLOCKED: only the partner being credited can respond';
  end if;

  select coalesce(sum(final_cost), 0), count(*) into v_sum, v_count
  from public.pto_transactions
  where series_id = p_series_id and status = 'pending';

  if v_count = 0 then
    raise exception 'ALREADY_RESOLVED: nothing in this series is still pending';
  end if;

  if p_approve then
    update public.pto_transactions set status = 'approved'
    where series_id = p_series_id and status = 'pending';

    update public.pto_balances
    set current_balance = current_balance + v_sum, updated_at = now()
    where household_id = v_household_id and user_id is not distinct from v_user_id;
  else
    update public.pto_transactions set status = 'denied'
    where series_id = p_series_id and status = 'pending';
  end if;

  return v_count;
end;
$$;

-- ============================================================
-- RPC: cancel_pto_series — requester cancels every remaining (not-yet-
-- started) instance. Approved future ones have their credit clawed back.
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
  if v_initiated_by is null or v_initiated_by != auth.uid() then
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
-- RPC: reschedule_pto_series — requester shifts every remaining instance by
-- N days. Time-of-day is preserved, so hours and the peak multiplier don't
-- change and nothing needs re-approving; only the dates move.
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
  if v_initiated_by is null or v_initiated_by != auth.uid() then
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
