"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLogo, APP_TITLE_CLASS } from "@/components/app-logo";
import { buttonVariants } from "@/components/ui/button";
import {
  IconImbalance,
  IconBlankLedger,
  IconLedgerBalanced,
  IconDuration,
  IconCreditTransfer,
  IconCalendarGrid,
  IconFairBalance,
} from "@/components/how-it-works/step-icons";

type Step = {
  kicker: string;
  title: string;
  body: string;
  Icon: () => React.JSX.Element;
};

const STEPS: Step[] = [
  {
    kicker: "The problem",
    title: "Someone's always on call",
    body: "Between school runs, sick days, and the 3am wake-ups, parenting doesn't stop — but it doesn't stop evenly, either. One parent quietly ends up carrying more of the always-on weight. Not by agreement. By default.",
    Icon: IconImbalance,
  },
  {
    kicker: "Why it's hard to fix",
    title: "Nobody's counting, so nobody can prove it",
    body: "Without a record, “I never get a break” is just a feeling — easy to dismiss, painful to keep repeating. Bringing it up starts to feel like keeping score in a relationship that isn't supposed to be about scores at all.",
    Icon: IconBlankLedger,
  },
  {
    kicker: "The idea",
    title: "Make the invisible, visible",
    body: "Parental PTO turns time off duty into something as concrete as vacation days: a single, shared ledger both of you can see. Not to keep score for its own sake — to make fairness a fact you can point to, instead of an argument you have to win.",
    Icon: IconLedgerBalanced,
  },
  {
    kicker: "How it works · 1",
    title: "Go off duty, come back on duty",
    body: "Request time off with a start and an end — a night out, a weekend away, or just a quiet afternoon alone. The app does the math, including a fair premium for hours that cost more. A 2am wake-up isn't the same as a Tuesday lunch.",
    Icon: IconDuration,
  },
  {
    kicker: "How it works · 2",
    title: "Credit goes to whoever held it down",
    body: "When your partner approves the request, the balance credits to them — not you. Being off duty has a real cost, and it's paid automatically to whoever covered for you, visible to both of you the moment it's approved.",
    Icon: IconCreditTransfer,
  },
  {
    kicker: "How it works · 3",
    title: "See the whole picture, always",
    body: "A shared calendar of who's been off and when. Balances and stats, side by side. No more relitigating who had the harder month — just an honest ledger you both already trust.",
    Icon: IconCalendarGrid,
  },
  {
    kicker: "The point",
    title: "Fair isn't always 50/50. Fair is knowing.",
    body: "This isn't about tallying favors in a marriage. It's about giving each of you real, guilt-free space to be a person again — without either of you quietly carrying a debt the other can't see. Track it once, and you can stop keeping score in your head.",
    Icon: IconFairBalance,
  },
];

export default function HowItWorksPage() {
  const [step, setStep] = useState(0);
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const current = STEPS[step];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <AppLogo />
            <h1 className={APP_TITLE_CLASS}>Parental PTO</h1>
          </div>
          <Link href="/login" className="text-muted-foreground hover:text-foreground text-sm underline">
            Skip
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              aria-current={i === step}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "bg-primary w-8" : "bg-border w-1.5 hover:bg-muted-foreground"
              }`}
            />
          ))}
        </div>

        <div
          key={step}
          className="animate-in fade-in-0 slide-in-from-bottom-4 flex flex-col items-center gap-6 text-center duration-500"
        >
          <div className="border-border bg-card flex aspect-square w-32 items-center justify-center border">
            <current.Icon />
          </div>

          <div className="space-y-3">
            <p className="label-tag text-muted-foreground">{current.kicker}</p>
            <h2 className="text-2xl font-semibold text-balance">{current.title}</h2>
            <p className="text-muted-foreground mx-auto max-w-xl text-balance">{current.body}</p>
          </div>

          {isLast && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <Link href="/demo" className={buttonVariants({ size: "lg" })}>
                Try the demo
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Create an account
              </Link>
            </div>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={isFirst}
            className={buttonVariants({ variant: "ghost", className: "disabled:opacity-0" })}
          >
            &larr; Back
          </button>
          <p className="text-muted-foreground font-mono text-xs">
            {step + 1} / {STEPS.length}
          </p>
          {isLast ? (
            <div className="w-[68px]" />
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
              className={buttonVariants({ variant: "ghost" })}
            >
              Next &rarr;
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
