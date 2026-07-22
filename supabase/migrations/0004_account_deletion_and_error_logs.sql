-- ============================================================
-- Parental PTO — self-service account deletion + error logging
--
-- Run this in the Supabase SQL Editor after 0003_manual_partner.sql.
-- ============================================================

-- ============================================================
-- Account deletion
--
-- initiated_by needs to become nullable so delete_my_account() can detach
-- a departing user's history instead of relying on FK cascade to remove
-- it — cascading would delete transactions the REMAINING partner's
-- balance depends on (a transaction credits one person's balance
-- regardless of who initiated it; erasing it would erase that credit).
-- user_id was already made nullable in 0003 for the same reason (and to
-- represent a manual partner).
-- ============================================================
alter table public.pto_transactions alter column initiated_by drop not null;

-- ============================================================
-- RPC: delete_my_account — detaches the caller from shared history, then
-- removes their auth user (which cascades to their own profile and their
-- own pto_balances row via existing ON DELETE CASCADE). If they were the
-- only member of their household, the household goes too; if a partner
-- remains, the partner's own data and balance are untouched.
-- ============================================================
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_household_id uuid;
  v_other_count int;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select household_id into v_household_id from public.profiles where id = v_uid;

  update public.pto_transactions set initiated_by = null where initiated_by = v_uid;
  update public.pto_transactions set user_id = null where user_id = v_uid;
  delete from public.invitations where created_by = v_uid;
  update public.invitations set used_by = null where used_by = v_uid;

  if v_household_id is not null then
    select count(*) into v_other_count
    from public.profiles
    where household_id = v_household_id and id != v_uid;

    if v_other_count = 0 then
      delete from public.households where id = v_household_id;
    end if;
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

-- ============================================================
-- error_logs — client/server error reports. No client SELECT/INSERT
-- policy at all: rows are written only via the service-role key from
-- app/api/log-error/route.ts, and read only via the service role from
-- the admin page (app/dashboard/admin), gated on an ADMIN_EMAIL env var,
-- not by RLS. RLS is enabled with zero policies, so it's default-deny for
-- every normal client regardless.
-- ============================================================
create table public.error_logs (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  stack text,
  digest text,
  path text,
  user_id uuid,
  created_at timestamptz not null default now()
);

alter table public.error_logs enable row level security;

create index on public.error_logs (created_at desc);
