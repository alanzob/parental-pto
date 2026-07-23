export type ReleaseEntry = {
  date: string; // ISO date
  label: string;
  items: string[];
};

// Newest first. Key features only, in plain language — not a commit log.
export const RELEASE_HISTORY: ReleaseEntry[] = [
  {
    date: "2026-07-23",
    label: "July 23, 2026",
    items: [
      "Multi-day trips — pick when you leave and when you're back, and it works out fair credit for every partial day",
      "Weighted time blocks — mornings, afternoons, evenings, and full days each carry their own credit",
      "Log Me Time for a partner who hasn't joined yet, with credit banked on their behalf automatically",
      "Open beta launched, with a way to send feedback right from the app",
      "Refreshed logo and a cleaner welcome screen",
    ],
  },
  {
    date: "2026-07-22",
    label: "July 22, 2026",
    items: [
      "Edit or cancel a Me Time request after the fact",
      "Recurring Me Time — set up a weekly slot once and it repeats automatically",
      "A redesigned look and feel across sign-in and onboarding",
      'Rebranded to MyTO — "time to be you"',
    ],
  },
  {
    date: "2026-07-21",
    label: "July 21, 2026",
    items: [
      "First version live — a shared ledger for trading off Me Time, with a no-signup demo to try it first",
      "Subscribe to a private calendar feed so your Me Time shows up in Google or Apple Calendar",
      "One simple ledger instead of separate categories, so balances stay easy to read at a glance",
      "Support for a partner who isn't ready to join yet, plus a chart showing how balanced things really are",
      "Password reset, a privacy page, and the ability to delete your account any time",
      "A guided walkthrough for anyone new, and a smoother experience on phones",
    ],
  },
];
