const STEPS = [
  {
    n: "01",
    title: "Claim My Time",
    body: "A night out, a run, a quiet afternoon alone — set a start and an end.",
  },
  {
    n: "02",
    title: "Your partner gets theirs",
    body: "Credit is given to whoever covered, literally.",
  },
  {
    n: "03",
    title: "See the whole picture",
    body: "One shared ledger, synced straight to your own Google or Apple calendar.",
  },
];

// Condensed version of the /how-it-works walkthrough, sized to sit directly
// on the login splash instead of behind a link.
export function MiniHowItWorks() {
  return (
    <ol className="space-y-2.5">
      {STEPS.map((step) => (
        <li key={step.n} className="flex items-start gap-3">
          <span className="text-muted-foreground font-mono text-xs tabular-nums pt-0.5">
            {step.n}
          </span>
          <div>
            <p className="text-sm font-medium leading-tight">{step.title}</p>
            <p className="text-muted-foreground text-xs leading-snug">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
