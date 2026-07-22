-- ============================================================
-- Parental PTO — edit and cancel individual requests
--
-- Adds the ability to edit the timing of a request after it's submitted,
-- and to cancel one, both before and after approval. Also adds the
-- series_id column that Phase 2 (recurring requests) will group instances
-- by — harmless and unused until then.
--
-- Balance model reminder: a request credits ONE person's balance (the
-- partner covering for the requester). That target is pto_transactions
-- .user_id, which is a real uuid in invited mode and NULL for a manual
-- (non-participating) partner. Every balance touch below therefore uses
--   where user_id is not distinct from v_txn.user_id
-- so the same statement hits the right row in both modes.
--
-- 'cancelled' is already in the status CHECK constraint from 0001, so no
-- constraint change is needed here.
--
-- Run this in the Supabase SQL Editor after 0005.
-- ============================================================

alter table public.pto_transactions add column if not exists series_id uuid;
create index if not exists pto_transactions_series_id_idx on public.pto_transactions (series_id);

-- ============================================================
-- RPC: edit_pto_request — only the requester (initiated_by) may edit, and
-- only while the request is pending or approved. Recomputes base_hours,
-- the peak multiplier, and final_cost from the new window.
--
-- Answer chosen: "re-approve on edit". If an APPROVED request is edited in
-- invited mode, the old credit is reversed and the request drops back to
-- 'pending' — the partner re-approves (via the existing approve_pto_request)
-- and only then is the new amount credited. In manual mode there's no one
-- to re-approve, so the balance is just adjusted by the delta and the
-- request stays approved.
-- ============================================================
create or replace function public.edit_pto_request(
  p_transaction_id uuid,
  p_off_duty_start timestamptz,
  p_back_on_duty timestamptz,
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
  v_local_time time;
  v_multiplier numeric(4,2) := 1.0;
  v_base_hours numeric(6,2);
  v_final_cost numeric(8,2);
  v_new_status text;
begin
  if p_back_on_duty <= p_off_duty_start then
    raise exception 'INVALID_WINDOW: back-on-duty must be after off-duty-start';
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

  v_base_hours := round(extract(epoch from (p_back_on_duty - p_off_duty_start)) / 3600, 2);
  v_local_time := (p_off_duty_start at time zone v_household.timezone)::time;
  if v_local_time >= v_household.peak_window_start and v_local_time < v_household.peak_window_end then
    v_multiplier := v_household.peak_multiplier;
  end if;
  v_final_cost := round(v_base_hours * v_multiplier, 2);

  v_new_status := v_txn.status;

  if v_txn.status = 'approved' then
    if v_household.partner_mode = 'manual' then
      -- No one to re-approve: adjust the virtual balance by the delta,
      -- stay approved.
      update public.pto_balances
      set current_balance = current_balance - v_txn.final_cost + v_final_cost, updated_at = now()
      where household_id = v_txn.household_id and user_id is not distinct from v_txn.user_id;
    else
      -- Reverse the old credit and send back to pending for re-approval.
      update public.pto_balances
      set current_balance = current_balance - v_txn.final_cost, updated_at = now()
      where household_id = v_txn.household_id and user_id is not distinct from v_txn.user_id;
      v_new_status := 'pending';
    end if;
  end if;

  update public.pto_transactions
  set occurred_at = p_off_duty_start,
      base_hours = v_base_hours,
      multiplier = v_multiplier,
      final_cost = v_final_cost,
      note = p_note,
      status = v_new_status
  where id = p_transaction_id
  returning * into v_txn;

  return v_txn;
end;
$$;

-- ============================================================
-- RPC: cancel_pto_request — the requester can cancel anytime. If the
-- request was approved, its credit is clawed back from the partner's
-- balance. Pending/denied requests never credited anything, so cancelling
-- them just flips the status.
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

  if v_txn.initiated_by != auth.uid() then
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
