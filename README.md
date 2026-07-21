# Parental PTO

A shared PTO ledger for two-parent households: three per-category balances
(Afternoon/Night Off, Day Away, Passive PTO), partner-approved conversions
between categories, email/password auth, and a hosted ICS calendar feed
each partner can subscribe to from their own Google/Apple calendar.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui, Supabase
(Postgres + Auth + RLS), deployed on Vercel. Everything runs on the free
tier of both — see the cost breakdown at the bottom.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), create a new project (free tier).
2. In the SQL Editor, paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   and run it. This creates every table, RLS policy, trigger, and RPC the
   app needs.
3. Go to **Authentication → Providers → Email** and make sure Email is
   enabled, then turn **off** "Confirm email". This app uses plain
   email/password sign-in with no email-based flow at all — with
   confirmation left on, new accounts would need to click an emailed
   confirmation link before they could sign in, reintroducing the same
   email-delivery dependency this method exists to avoid.
4. Go to **Settings → API Keys** (Supabase moved this out of "Project
   Settings → API" and replaced the old anon/service_role keys with new
   ones — new projects only have the new system):
   - **Project URL** (top of the page) → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Under **Secret keys**, click to reveal/create one (`sb_secret_...`) → `SUPABASE_SERVICE_ROLE_KEY` (keep this one secret — it's server-only, used exclusively by the calendar feed route to look up a household by its feed token)

   These are drop-in replacements for the old anon/service_role keys — same
   env var names in this project, just newer key formats.

## 2. Run it locally

```bash
cp .env.local.example .env.local
# fill in the three values from step 1.4 above
npm install
npm run dev
```

Open http://localhost:3000 — you should land on `/login`. Use the "Create
account" tab once, then "Sign in" on subsequent visits.

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, "Add New Project" → import the repo. Framework preset
   (Next.js) is auto-detected.
3. Add the same three environment variables from step 1.4 in the Vercel
   project's **Settings → Environment Variables**.
4. Deploy.

No Supabase URL/redirect configuration is needed for auth — email/password
sign-in doesn't involve any redirect links, so it works identically in dev
and prod.

## Admin scripts

There's no self-service "forgot password" flow in the app — adding one
would mean sending a reset email, reintroducing the exact email
dependency this build avoids. Instead, resetting a password is a local
admin action, same pattern as the signup route (uses the Admin API via
`SUPABASE_SERVICE_ROLE_KEY`, so it only ever runs on your machine):

```bash
node scripts/reset-password.mjs someone@example.com newpassword123
```

## Notes on this build

- **Auth is plain email/password** — no Google OAuth, no magic links. This
  was a deliberate downgrade from magic-link auth after repeatedly hitting
  Supabase's built-in email rate limit, PKCE cross-browser breakage
  (a clicked link only works in the browser that requested it), and
  redirect-URL misconfiguration between dev and prod. Password auth has
  none of these failure modes since no email is sent at sign-in.
- **Calendar integration is a hosted ICS feed**, not OAuth. Each household
  gets a secret, regenerable URL (Settings → Calendar feed) that either
  partner subscribes to from Google Calendar ("Other calendars → From
  URL") or Apple Calendar ("File → New Calendar Subscription"). Calendar
  apps poll infrequently (hours, not seconds) — that's expected.
- **Balances are never written directly by the client.** Every
  balance-affecting action goes through a `SECURITY DEFINER` Postgres
  function (`create_pto_request`, `approve_conversion`, `redeem_invite`,
  etc.) — see the comments at the top of the migration file for the full
  list of deviations from the original architecture doc.

## Cost

Both Vercel Hobby and Supabase's free tier are enough for a two-person
household at this scale — expect $0/month. The one gotcha: Supabase free
projects pause after 7 days of inactivity and need a manual restore on
next visit. If that's annoying, Supabase Pro is $25/mo.
