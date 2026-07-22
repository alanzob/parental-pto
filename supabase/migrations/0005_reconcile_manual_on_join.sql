-- ============================================================
-- Parental PTO — reconcile manual-mode history when a real partner joins
--
-- 0003's redeem_invite already flips partner_mode back to 'invited' when a
-- real second person joins a household that had a manual partner, but it
-- left the manual-mode data (the virtual, user_id-is-null balance and any
-- transactions credited to it) permanently orphaned — the balance the
-- solo user had already banked on the manual partner's behalf, and any
-- pre-join history, would sit stuck under a null user_id forever, showing
-- as "banked to —" instead of the real partner's name.
--
-- This is specifically what makes the "quick start" onboarding flow work:
-- someone sets up their household, adds their partner as a manual
-- placeholder, backfills recent history against them (auto-approved,
-- since there's no one to approve it yet), then sends the real invite.
-- Once the partner actually joins, this reconciliation hands all of that
-- straight to their real account instead of losing the attribution.
--
-- Run this in the Supabase SQL Editor after 0004.
-- ============================================================

create or replace function public.redeem_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_was_manual boolean;
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

  select (partner_mode = 'manual') into v_was_manual
  from public.households where id = v_invite.household_id;

  update public.profiles
  set household_id = v_invite.household_id
  where id = auth.uid();

  update public.invitations
  set status = 'accepted', used_by = auth.uid(), used_at = now()
  where id = v_invite.id;

  insert into public.pto_balances (household_id, user_id)
  values (v_invite.household_id, auth.uid())
  on conflict (household_id, user_id) do nothing;

  if v_was_manual then
    -- Reattribute pre-join history to the real, newly-joined partner
    -- instead of leaving it under a null user_id.
    update public.pto_transactions
    set user_id = auth.uid()
    where household_id = v_invite.household_id and user_id is null;

    -- Merge whatever was already banked on the manual partner's behalf
    -- into the fresh balance row just inserted above, then drop the
    -- now-empty virtual row.
    update public.pto_balances joiner
    set current_balance = joiner.current_balance + coalesce(manual.current_balance, 0),
        updated_at = now()
    from public.pto_balances manual
    where joiner.household_id = v_invite.household_id
      and joiner.user_id = auth.uid()
      and manual.household_id = v_invite.household_id
      and manual.user_id is null;

    delete from public.pto_balances
    where household_id = v_invite.household_id and user_id is null;

    update public.households
    set partner_mode = 'invited', manual_partner_name = null
    where id = v_invite.household_id;
  end if;

  return v_invite.household_id;
end;
$$;
