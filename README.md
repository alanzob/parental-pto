# Parental PTO

A shared PTO ledger for two-parent households: three per-category balances
(Afternoon/Night Off, Day Away, Passive PTO), partner-approved conversions
between categories, magic-link auth, and a hosted ICS calendar feed each
partner can subscribe to from their own Google/Apple calendar.

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
   enabled. Magic link is on by default.
3.5. Go to **Authentication → Emails → Magic Link** and add `{{ .Token }}`
   somewhere in the template body (e.g. "Or enter this code: `{{ .Token }}`").
   By default the template only includes the clickable link — the login
   page's 6-digit code fallback (for when the link is opened on a different
   device/browser than it was requested from) won't have anything to show
   until this is added.
4. Go to **Authentication → URL Configuration** and set:
   - **Site URL**: your Vercel deployment URL (e.g. `https://parental-pto.vercel.app`) — or `http://localhost:3000` while developing locally
   - **Redirect URLs**: add `http://localhost:3000/auth/callback` (dev) and `https://<your-vercel-domain>/auth/callback` (prod)
5. Go to **Settings → API Keys** (Supabase moved this out of "Project
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
# fill in the three values from step 1.5 above
npm install
npm run dev
```

Open http://localhost:3000 — you should land on `/login`. Request a magic
link, and either click it (same browser) or enter the 6-digit code from the
email.

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, "Add New Project" → import the repo. Framework preset
   (Next.js) is auto-detected.
3. Add the same three environment variables from step 1.5 in the Vercel
   project's **Settings → Environment Variables**.
4. Deploy. Once you have the deployment URL, go back to Supabase's
   **Authentication → URL Configuration** and add
   `https://<your-vercel-domain>/auth/callback` to the redirect URLs (and
   update Site URL to match) — magic links won't complete without this.

## Notes on this build

- **Auth is magic-link only** — no Google OAuth anywhere. Supabase's magic
  link uses a PKCE flow, meaning the link only works in the same browser
  that requested it (opening an email link from a phone's Mail app in a
  different browser will fail). The login page also offers the 6-digit
  code from the same email as a fallback that works regardless of device.
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
