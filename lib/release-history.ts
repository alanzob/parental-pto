export type ReleaseEntry = {
  date: string; // ISO date
  label: string;
  items: string[];
};

// Newest first. One entry per day of shipped changes — kept to
// feature-level, user-facing language rather than raw commit messages.
export const RELEASE_HISTORY: ReleaseEntry[] = [
  {
    date: "2026-07-23",
    label: "July 23, 2026",
    items: [
      "Multi-day trip calculator — pick a departure and return time of day and it works out the exact coverage, not just whole days",
      "Manual partner logging — log and auto-approve time off for a partner who hasn't signed up yet",
      "Weighted time-off categories — morning, afternoon, evening, and full-day requests now carry different credit",
      "Open beta launched — feedback form, a beta banner, and an admin dashboard for growth and feedback",
      "Refreshed logo and trimmed the login page copy",
    ],
  },
  {
    date: "2026-07-22",
    label: "July 22, 2026",
    items: [
      "Edit and cancel requests after the fact, instead of only creating them",
      "Recurring requests — set up a weekly series with bulk approve/deny for the whole run",
      "New editorial visual identity — a proper type system and a redesigned login/onboarding flow",
      'Rebranded to MyTO — "time to be you" — and broadened beyond just parents',
    ],
  },
  {
    date: "2026-07-21",
    label: "July 21, 2026",
    items: [
      "First version live — a shared, Supabase-backed ledger with a no-signup demo mode",
      "Switched sign-in from magic links to email + password for reliability",
      "Unified separate time-off categories into a single credit-based ledger",
      "Manual-partner mode, a balance-disparity chart, and richer demo data",
      "Public-beta readiness pass — password reset, a privacy page, self-service account deletion, favicon, error logging",
      'Mobile polish pass and a click-through "how it works" walkthrough for new users',
    ],
  },
];
