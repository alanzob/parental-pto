-- ============================================================
-- Parental PTO — unify the ledger, drop categories
--
-- Supersedes the category-based, self-debiting model from 0001 with the
-- model actually wanted: ONE balance per person (no categories), a named
-- request with an off-duty-start/back-on-duty window, submitted as
-- 'pending', and approval by the OTHER partner CREDITS THEIR balance
-- (the requester's own balance never changes — banked time represents
-- "hours my partner is owed because they covered for me").
--
-- This makes the separate pto_conversions system (moving hours between
-- categories) meaningless — there are no categories to convert between
-- any more — so it's dropped along with approve_conversion/deny_conversion.
-- The request-approval flow itself is now the only approval mechanism.
--
-- Run this in the Supabase SQL Editor after 0001_init.sql.
-- ============================================================

-- ============================================================
-- Drop what's going away
-- ============================================================
drop function if exists public.approve_conversion(uuid);
drop function if exists public.deny_conversion(uuid);
drop function if exists public.create_pto_request(text, numeric, timestamptz, text);
drop table if exists public.pto_conversions;

-- ============================================================
-- pto_balances: one row per person, no category
-- ============================================================

-- Collapse any existing per-category rows (from before this migration)
-- into a single summed balance per person — MUST happen before the
-- unique(household_id, user_id) constraint below, or it'll reject the
-- duplicates. Written to be safe to re-run: if rows are already
-- consolidated to one per person, this is a no-op (summing one row
-- equals itself, and there are no "extra" rows left to delete).
with summed as (
  select household_id, user_id, sum(current_balance) as total
  from public.pto_balances
  group by household_id, user_id
),
keep as (
  select distinct on (household_id, user_id) id, household_id, user_id
  from public.pto_balances
  order by household_id, user_id, updated_at desc nulls last, id
)
update public.pto_balances b
set current_balance = s.total, updated_at = now()
from summed s, keep k
where b.id = k.id
  and k.household_id = s.household_id
  and k.user_id = s.user_id;

delete from public.pto_balances b
using keep k
where b.household_id = k.household_id
  and b.user_id = k.user_id
  and b.id != k.id;

alter table public.pto_balances drop constraint if exists pto_balances_household_id_user_id_category_key;
alter table public.pto_balances drop column if exists category;
alter table public.pto_balances drop constraint if exists pto_balances_household_id_user_id_key;
alter table public.pto_balances add constraint pto_balances_household_id_user_id_key unique (household_id, user_id);

-- ============================================================
-- pto_transactions: named requests, no category, credit-only
-- ============================================================
alter table public.pto_transactions drop column if exists category;
alter table public.pto_transactions add column if not exists title text not null default 'Time off';
alter table public.pto_transactions alter column title drop default;

alter table public.pto_transactions drop constraint if exists pto_transactions_transaction_type_check;
alter table public.pto_transactions add constraint pto_transactions_transaction_type_check
  check (transaction_type in ('request'));

-- ============================================================
-- create_household / redeem_invite: seed a single balance row
-- ============================================================
create or replace function public.create_household(p_name text default 'Our Household')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  if exists (select 1 from public.profiles where id = auth.uid() and household_id is not null) then
    raise exception 'ALREADY_IN_HOUSEHOLD: you already belong to a household';
  end if;

  insert into public.households (name)
  values (coalesce(nullif(trim(p_name), ''), 'Our Household'))
  returning id into v_household_id;

  update public.profiles set household_id = v_household_id where id = auth.uid();

  insert into public.pto_balances (household_id, user_id)
  values (v_household_id, auth.uid())
  on conflict (household_id, user_id) do nothing;

  return v_household_id;
end;
$$;

create or replace function public.redeem_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
begin
  select * into v_invite
  from public.invitations
  where invite_code = p_invite_code
  for update;

  if v_invite is null then
    raise exception 'INVALID_CODE: no such invite';
  end if;

  if v_invite.status != 'pending' then
    raise exception 'CODE_ALREADY_USED: this invite has already been redeemed';
  end if;

  if v_invite.expires_at < now() then
    update public.invitations set status = 'expired' where id = v_invite.id;
    raise exception 'CODE_EXPIRED: this invite has expired';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid() and household_id is not null) then
    raise exception 'ALREADY_IN_HOUSEHOLD: you already belong to a household';
  end if;

  update public.profiles
  set household_id = v_invite.household_id
  where id = auth.uid();

  update public.invitations
  set status = 'accepted', used_by = auth.uid(), used_at = now()
  where id = v_invite.id;

  insert into public.pto_balances (household_id, user_id)
  values (v_invite.household_id, auth.uid())
  on conflict (household_id, user_id) do nothing;

  return v_invite.household_id;
end;
$$;

-- ============================================================
-- RPC: create_pto_request — submits a named, off-duty-window request.
-- Pending until the OTHER partner approves. Applies the peak-hour
-- multiplier (based on when the off-duty window STARTS) to compute the
-- credit amount, but does not touch any balance yet.
-- ============================================================
create or replace function public.create_pto_request(
  p_title text,
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
  v_household_id uuid;
  v_household public.households;
  v_partner_id uuid;
  v_local_time time;
  v_multiplier numeric(4,2) := 1.0;
  v_base_hours numeric(6,2);
  v_final_cost numeric(8,2);
  v_txn public.pto_transactions;
begin
  if p_title is null or trim(p_title) = '' then
    raise exception 'INVALID_TITLE: give this request a name';
  end if;

  if p_back_on_duty <= p_off_duty_start then
    raise exception 'INVALID_WINDOW: back-on-duty must be after off-duty-start';
  end if;

  select household_id into v_household_id from public.profiles where id = auth.uid();
  if v_household_id is null then
    raise exception 'NO_HOUSEHOLD: you must belong to a household';
  end if;

  select id into v_partner_id
  from public.profiles
  where household_id = v_household_id and id != auth.uid()
  limit 1;

  if v_partner_id is null then
    raise exception 'NO_PARTNER: invite your partner before requesting time off';
  end if;

  select * into v_household from public.households where id = v_household_id;

  v_base_hours := round(extract(epoch from (p_back_on_duty - p_off_duty_start)) / 3600, 2);

  v_local_time := (p_off_duty_start at time zone v_household.timezone)::time;
  if v_local_time >= v_household.peak_window_start and v_local_time < v_household.peak_window_end then
    v_multiplier := v_household.peak_multiplier;
  end if;

  v_final_cost := round(v_base_hours * v_multiplier, 2);

  insert into public.pto_transactions (
    household_id, user_id, initiated_by, transaction_type,
    title, base_hours, multiplier, final_cost, status, note, occurred_at
  ) values (
    v_household_id, v_partner_id, auth.uid(), 'request',
    trim(p_title), v_base_hours, v_multiplier, v_final_cost, 'pending', p_note, p_off_duty_start
  ) returning * into v_txn;

  return v_txn;
end;
$$;

-- ============================================================
-- RPC: approve_pto_request / deny_pto_request
-- Only the credited partner (pto_transactions.user_id) may respond —
-- never the requester (initiated_by) approving their own request.
-- ============================================================
create or replace function public.approve_pto_request(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_txn record;
begin
  select * into v_txn from public.pto_transactions where id = p_transaction_id for update;

  if v_txn is null then
    raise exception 'NOT_FOUND: no such request';
  end if;

  if v_txn.household_id != public.current_household_id() then
    raise exception 'FORBIDDEN: not your household';
  end if;

  if v_txn.user_id != auth.uid() then
    raise exception 'SELF_APPROVAL_BLOCKED: only the partner being credited can approve this request';
  end if;

  if v_txn.status != 'pending' then
    raise exception 'ALREADY_RESOLVED: this request has already been handled';
  end if;

  update public.pto_transactions set status = 'approved' where id = p_transaction_id;

  update public.pto_balances
  set current_balance = current_balance + v_txn.final_cost, updated_at = now()
  where household_id = v_txn.household_id and user_id = v_txn.user_id;
end;
$$;

create or replace function public.deny_pto_request(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_txn record;
begin
  select * into v_txn from public.pto_transactions where id = p_transaction_id for update;

  if v_txn is null then
    raise exception 'NOT_FOUND: no such request';
  end if;

  if v_txn.household_id != public.current_household_id() then
    raise exception 'FORBIDDEN: not your household';
  end if;

  if v_txn.user_id != auth.uid() then
    raise exception 'SELF_APPROVAL_BLOCKED: only the partner being credited can deny this request';
  end if;

  if v_txn.status != 'pending' then
    raise exception 'ALREADY_RESOLVED: this request has already been handled';
  end if;

  update public.pto_transactions set status = 'denied' where id = p_transaction_id;
end;
$$;
