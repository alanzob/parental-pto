-- ============================================================
-- MyTO — beta feedback inbox
--
-- Same zero-default pattern as error_logs (0004): RLS enabled, no client
-- policies at all. Writes go through the service role from
-- app/api/contact/route.ts; reads/updates (marking resolved) go through
-- the service role from the consolidated admin page.
--
-- Run this in the Supabase SQL Editor after 0009.
-- ============================================================

create table public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  email text,
  category text not null check (category in ('bug', 'feature', 'general')),
  message text not null,
  resolved boolean not null default false
);

alter table public.beta_feedback enable row level security;

create index on public.beta_feedback (created_at desc);
