-- ============================================================
-- Parental PTO — manual (non-participating) partner support
--
-- Lets someone use the app solo, tracking time on behalf of a partner who
-- isn't going to sign up. There's no second auth.users row for a manual
-- partner, so they're represented as a NULL user_id: one pto_balances row
-- per household with user_id is null (their "virtual" balance), and any
-- pto_transactions credited to them also carry user_id = null. Since
-- there's nobody else to approve anything, requests in manual mode are
-- auto-approved by create_pto_request itself instead of going to 'pending'.
--
-- If a real second person later joins via redeem_invite, the household
-- flips back to 'invited' mode automatically — the manual-mode data is
-- left in place as history (harmless: it's filtered out by household_id
-- like everything else, and nothing joins on the stale NULL rows going
-- forward).
--
-- Run this in the Supabase SQL Editor after 0002_unify_ledger.sql.
-- ============================================================

alter table public.households
  add column if not exists partner_mode text not null default 'invited'
    check (partner_mode in ('invited', 'manual')),
  add column if not exists manual_partner_name text;

alter table public.pto_balances alter column user_id drop not null;
alter table public.pto_transactions alter column user_id drop not null;

-- At most one "virtual" balance row (user_id is null) per household —
-- the normal (household_id, user_id) unique constraint doesn't cover this
-- since standard unique constraints treat every NULL as distinct.
create unique index if not exists pto_balances_household_manual_key
  on public.pto_balances (household_id)
  where user_id is null;

-- ============================================================
-- RPC: add_manual_partner — switches the household into manual mode and
-- seeds their virtual balance row. Safe to call again to rename them.
-- ============================================================
create or replace function public.add_manual_partner(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  if p_name is null or trim(p_name) = '' then
    raise exception 'INVALID_NAME: give your partner a name';
  end if;

  v_household_id := public.current_household_id();
  if v_household_id is null then
    raise exception 'NO_HOUSEHOLD: you must belong to a household';
  end if;

  if exists (
    select 1 from public.profiles
    where household_id = v_household_id and id != auth.uid()
  ) then
    raise exception 'ALREADY_HAS_PARTNER: this household already has a second member';
  end if;

  update public.households
  set partner_mode = 'manual', manual_partner_name = trim(p_name)
  where id = v_household_id;

  insert into public.pto_balances (household_id, user_id, current_balance)
  values (v_household_id, null, 0)
  on conflict (household_id) where user_id is null do nothing;
end;
$$;

-- ============================================================
-- RPC: remove_manual_partner — reverts to 'invited' mode. The virtual
-- balance/transaction history is left in place, not deleted.
-- ============================================================
create or replace function public.remove_manual_partner()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  v_household_id := public.current_household_id();
  if v_household_id is null then
    raise exception 'NO_HOUSEHOLD: you must belong to a household';
  end if;

  update public.households
  set partner_mode = 'invited', manual_partner_name = null
  where id = v_household_id and partner_mode = 'manual';
end;
$$;

-- ============================================================
-- redeem_invite: auto-reconcile out of manual mode if a real partner
-- joins later, so the two states can never coexist.
-- ============================================================
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

  update public.households
  set partner_mode = 'invited', manual_partner_name = null
  where id = v_invite.household_id and partner_mode = 'manual';

  return v_invite.household_id;
end;
$$;

-- ============================================================
-- create_pto_request: branch on partner_mode. Manual-mode requests have
-- nobody else to approve them, so they're inserted as 'approved' directly
-- and credited to the virtual (user_id is null) balance in the same call.
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
  v_status text;
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
    trim(p_title), v_base_hours, v_multiplier, v_final_cost, v_status, p_note, p_off_duty_start
  ) returning * into v_txn;

  if v_status = 'approved' then
    update public.pto_balances
    set current_balance = current_balance + v_final_cost, updated_at = now()
    where household_id = v_household_id and user_id is null;
  end if;

  return v_txn;
end;
$$;
