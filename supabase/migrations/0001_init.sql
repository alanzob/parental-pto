-- ============================================================
-- Parental PTO — initial schema
--
-- Deviates from the original architecture doc in a few places:
--   * No google_calendar_tokens table / OAuth — auth is Supabase
--     email/password (no Google identity anywhere), and calendar
--     support is a hosted ICS feed (households.calendar_feed_token)
--     instead of pulling from Google/Apple. See
--     app/api/feed/[token]/route.ts.
--   * pto_transactions.calendar_event_id dropped — nothing external
--     to link to; the ICS feed is keyed off the transaction's own id.
--   * households gains calendar_feed_token, peak_window_start/end,
--     and timezone — needed to make "peak hours" and the calendar
--     feed concrete; the original doc named the concept but didn't
--     define these.
--   * pto_balances / pto_transactions ship with SELECT-only client
--     policies from day one. All balance-affecting writes go through
--     SECURITY DEFINER RPCs (create_household, create_pto_request,
--     regenerate_calendar_feed_token, redeem_invite,
--     approve_conversion, deny_conversion) — the doc's own Phase 2
--     recommendation, applied from the start instead of locked down
--     later.
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto"; -- for gen_random_uuid() / gen_random_bytes()

-- ============================================================
-- TABLE: households
-- ============================================================
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Household',
  timezone text not null default 'UTC', -- IANA tz name, used to resolve peak-hour windows
  use_it_or_lose_it_enabled boolean not null default false,
  use_it_or_lose_it_days integer, -- null = disabled, else N days until expiry
  overdraft_floor numeric(8,2) not null default 0, -- e.g. -8.00 hours allowed
  peak_multiplier numeric(4,2) not null default 1.50, -- e.g. bedtime = 1.5x
  peak_window_start time not null default '18:00',
  peak_window_end time not null default '20:00',
  calendar_feed_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABLE: profiles (mirrors auth.users, 1:1)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  display_name text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TABLE: invitations
-- ============================================================
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  invite_code text not null unique, -- short, URL-safe random code
  created_by uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABLE: pto_balances (one row per user PER CATEGORY)
-- ============================================================
create table public.pto_balances (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('afternoon_night_off', 'day_away', 'passive_pto')),
  current_balance numeric(8,2) not null default 0,
  overdraft_floor_override numeric(8,2), -- null = use household default
  last_expired_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (household_id, user_id, category)
);

-- ============================================================
-- TABLE: pto_transactions (the ledger)
-- ============================================================
create table public.pto_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id), -- whose balance is affected
  initiated_by uuid not null references public.profiles(id), -- who created the entry
  category text not null check (category in ('afternoon_night_off', 'day_away', 'passive_pto')),
  transaction_type text not null check (transaction_type in ('request', 'credit_earned', 'trade', 'gift', 'adjustment', 'expiration')),
  base_hours numeric(6,2) not null,
  multiplier numeric(4,2) not null default 1.0,
  final_cost numeric(8,2) not null, -- base_hours * multiplier; negative = debit
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'completed', 'cancelled')),
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABLE: pto_conversions (partner-approved cross-category transfers)
-- ============================================================
create table public.pto_conversions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  from_category text not null check (from_category in ('afternoon_night_off', 'day_away', 'passive_pto')),
  to_category text not null check (to_category in ('afternoon_night_off', 'day_away', 'passive_pto')),
  hours numeric(6,2) not null check (hours > 0),
  status text not null default 'pending_partner_approval'
    check (status in ('pending_partner_approval', 'approved', 'denied', 'cancelled')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (from_category != to_category)
);

create index on public.pto_transactions (household_id, user_id);
create index on public.pto_conversions (household_id, status);
create index on public.invitations (invite_code);

-- ============================================================
-- HELPER: resolve caller's household_id without RLS recursion
-- ============================================================
create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- TRIGGER: enforce max 2 profiles per household
-- ============================================================
create or replace function public.enforce_household_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.household_id is not null then
    if (select count(*) from public.profiles where household_id = new.household_id) >= 2 then
      raise exception 'HOUSEHOLD_FULL: this household already has two members';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_household_capacity
  before insert or update of household_id on public.profiles
  for each row execute function public.enforce_household_capacity();

-- ============================================================
-- RLS: enable on every table (default-deny until policies added)
-- ============================================================
alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.pto_balances enable row level security;
alter table public.pto_transactions enable row level security;
alter table public.pto_conversions enable row level security;

-- ---------- households ----------
create policy "households_select_own"
  on public.households for select
  using (id = public.current_household_id());

create policy "households_insert_authenticated"
  on public.households for insert
  with check (auth.uid() is not null);

create policy "households_update_own"
  on public.households for update
  using (id = public.current_household_id())
  with check (id = public.current_household_id());
  -- No delete policy: households are never hard-deleted from the client.

-- ---------- profiles ----------
create policy "profiles_select_self_or_partner"
  on public.profiles for select
  using (id = auth.uid() or household_id = public.current_household_id());

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_self_only"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- invitations ----------
create policy "invitations_select_own_household"
  on public.invitations for select
  using (household_id = public.current_household_id());

create policy "invitations_insert_own_household"
  on public.invitations for insert
  with check (household_id = public.current_household_id() and created_by = auth.uid());

create policy "invitations_update_own_household"
  on public.invitations for update
  using (household_id = public.current_household_id());
  -- Redemption BY CODE (joining user has no household_id yet) goes through
  -- redeem_invite() below, not these policies.

-- ---------- pto_balances ----------
-- SELECT only. All mutation happens via SECURITY DEFINER functions
-- (create_household, create_pto_request, approve_conversion) so a client
-- can never write current_balance directly.
create policy "balances_select_household"
  on public.pto_balances for select
  using (household_id = public.current_household_id());

-- ---------- pto_transactions ----------
-- SELECT only, for the same reason as pto_balances above.
create policy "transactions_select_household"
  on public.pto_transactions for select
  using (household_id = public.current_household_id());

-- ---------- pto_conversions ----------
create policy "conversions_select_household"
  on public.pto_conversions for select
  using (household_id = public.current_household_id());

create policy "conversions_insert_own_household"
  on public.pto_conversions for insert
  with check (household_id = public.current_household_id() and requested_by = auth.uid());
  -- Approval/denial is NOT done via a raw UPDATE policy — see
  -- approve_conversion() / deny_conversion() below, which enforce that the
  -- approver is the OTHER partner, not the requester.

-- ============================================================
-- RPC: create_household — atomic create + assign creator + seed balances
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

  insert into public.pto_balances (household_id, user_id, category)
  values
    (v_household_id, auth.uid(), 'afternoon_night_off'),
    (v_household_id, auth.uid(), 'day_away'),
    (v_household_id, auth.uid(), 'passive_pto');

  return v_household_id;
end;
$$;

-- ============================================================
-- RPC: redeem_invite — the only way to join a household by code
-- ============================================================
create or replace function public.redeem_invite(p_invite_code text)
returns uuid -- returns household_id on success
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
  for update; -- lock to prevent a race between two simultaneous redemptions

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
  where id = auth.uid(); -- raises HOUSEHOLD_FULL via trigger if capacity exceeded

  update public.invitations
  set status = 'accepted', used_by = auth.uid(), used_at = now()
  where id = v_invite.id;

  insert into public.pto_balances (household_id, user_id, category)
  values
    (v_invite.household_id, auth.uid(), 'afternoon_night_off'),
    (v_invite.household_id, auth.uid(), 'day_away'),
    (v_invite.household_id, auth.uid(), 'passive_pto')
  on conflict (household_id, user_id, category) do nothing;

  return v_invite.household_id;
end;
$$;

-- ============================================================
-- RPC: create_pto_request — server-authoritative cost calculator
-- Applies the household's peak-hour multiplier (resolved in the
-- household's own timezone) and enforces the overdraft floor before
-- debiting the balance. This is the ONLY way a plain PTO request can
-- affect a balance from the client.
-- ============================================================
create or replace function public.create_pto_request(
  p_category text,
  p_base_hours numeric,
  p_occurred_at timestamptz default now(),
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
  v_local_time time;
  v_multiplier numeric(4,2) := 1.0;
  v_cost numeric(8,2);
  v_current_balance numeric(8,2);
  v_floor numeric(8,2);
  v_txn public.pto_transactions;
begin
  if p_base_hours is null or p_base_hours <= 0 then
    raise exception 'INVALID_HOURS: base_hours must be positive';
  end if;

  select household_id into v_household_id from public.profiles where id = auth.uid();
  if v_household_id is null then
    raise exception 'NO_HOUSEHOLD: you must belong to a household';
  end if;

  select * into v_household from public.households where id = v_household_id;

  v_local_time := (p_occurred_at at time zone v_household.timezone)::time;
  if v_local_time >= v_household.peak_window_start and v_local_time < v_household.peak_window_end then
    v_multiplier := v_household.peak_multiplier;
  end if;

  v_cost := round(p_base_hours * v_multiplier, 2);

  select current_balance,
         coalesce(overdraft_floor_override, v_household.overdraft_floor)
    into v_current_balance, v_floor
  from public.pto_balances
  where household_id = v_household_id and user_id = auth.uid() and category = p_category
  for update;

  if v_current_balance is null then
    raise exception 'NO_BALANCE_ROW: no % balance found for this user', p_category;
  end if;

  if (v_current_balance - v_cost) < v_floor then
    raise exception 'OVERDRAFT_FLOOR_EXCEEDED: this request would exceed the allowed negative balance';
  end if;

  insert into public.pto_transactions (
    household_id, user_id, initiated_by, category, transaction_type,
    base_hours, multiplier, final_cost, status, note, occurred_at
  ) values (
    v_household_id, auth.uid(), auth.uid(), p_category, 'request',
    p_base_hours, v_multiplier, -v_cost, 'completed', p_note, p_occurred_at
  ) returning * into v_txn;

  update public.pto_balances
  set current_balance = current_balance - v_cost, updated_at = now()
  where household_id = v_household_id and user_id = auth.uid() and category = p_category;

  return v_txn;
end;
$$;

-- ============================================================
-- RPC: approve_conversion / deny_conversion
-- Enforces that the approver is the OTHER household member, never the
-- requester approving their own conversion.
-- ============================================================
create or replace function public.approve_conversion(p_conversion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv record;
  v_from_balance numeric;
  v_floor numeric;
begin
  select * into v_conv
  from public.pto_conversions
  where id = p_conversion_id
  for update;

  if v_conv is null then
    raise exception 'NOT_FOUND: no such conversion request';
  end if;

  if v_conv.household_id != public.current_household_id() then
    raise exception 'FORBIDDEN: not your household';
  end if;

  if v_conv.requested_by = auth.uid() then
    raise exception 'SELF_APPROVAL_BLOCKED: you cannot approve your own conversion request';
  end if;

  if v_conv.status != 'pending_partner_approval' then
    raise exception 'ALREADY_RESOLVED: this request has already been handled';
  end if;

  -- Check overdraft floor on the source category before applying
  select current_balance, coalesce(overdraft_floor_override,
           (select overdraft_floor from public.households where id = v_conv.household_id))
    into v_from_balance, v_floor
  from public.pto_balances
  where household_id = v_conv.household_id
    and user_id = v_conv.requested_by
    and category = v_conv.from_category;

  if (v_from_balance - v_conv.hours) < v_floor then
    raise exception 'OVERDRAFT_FLOOR_EXCEEDED: this conversion would exceed the allowed negative balance';
  end if;

  update public.pto_balances
  set current_balance = current_balance - v_conv.hours, updated_at = now()
  where household_id = v_conv.household_id and user_id = v_conv.requested_by and category = v_conv.from_category;

  update public.pto_balances
  set current_balance = current_balance + v_conv.hours, updated_at = now()
  where household_id = v_conv.household_id and user_id = v_conv.requested_by and category = v_conv.to_category;

  update public.pto_conversions
  set status = 'approved', approved_by = auth.uid(), approved_at = now()
  where id = p_conversion_id;
end;
$$;

create or replace function public.deny_conversion(p_conversion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv record;
begin
  select * into v_conv from public.pto_conversions where id = p_conversion_id for update;

  if v_conv is null then
    raise exception 'NOT_FOUND: no such conversion request';
  end if;

  if v_conv.household_id != public.current_household_id() then
    raise exception 'FORBIDDEN: not your household';
  end if;

  if v_conv.requested_by = auth.uid() then
    raise exception 'SELF_APPROVAL_BLOCKED: you cannot deny your own conversion request';
  end if;

  update public.pto_conversions
  set status = 'denied', approved_by = auth.uid(), approved_at = now()
  where id = p_conversion_id;
end;
$$;

-- ============================================================
-- RPC: regenerate_calendar_feed_token — invalidates the old subscribe URL
-- ============================================================
create or replace function public.regenerate_calendar_feed_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_token text;
begin
  v_household_id := public.current_household_id();
  if v_household_id is null then
    raise exception 'NO_HOUSEHOLD: you must belong to a household';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');

  update public.households set calendar_feed_token = v_token where id = v_household_id;

  return v_token;
end;
$$;
