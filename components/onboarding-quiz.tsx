"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Q1 = "yes" | "no";
type Q2 = "kids" | "schedules" | "lonely" | "unaware" | "none";
type Q3 = "week" | "month" | "long";

type Answers = {
  q1?: Q1;
  q2?: Q2;
  q3?: Q3;
  q4?: string;
  q5?: string;
  q6?: string;
  name?: string;
  householdName?: string;
};

type Step = "intro" | "q1" | "q2" | "q3" | "tour" | "q4" | "q5" | "q6" | "q7" | "signup";

const QUESTION_ORDER: Step[] = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"];

function EscapeHatches({ onSignInInstead }: { onSignInInstead: () => void }) {
  return (
    <div className="text-muted-foreground mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <Link href="/demo" className="hover:text-foreground underline">
        Try the demo
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/how-it-works" className="hover:text-foreground underline">
        See how it works
      </Link>
      <span aria-hidden="true">·</span>
      <button type="button" onClick={onSignInInstead} className="hover:text-foreground underline">
        Sign in instead
      </button>
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  const i = QUESTION_ORDER.indexOf(step);
  if (i === -1) return null;
  return (
    <p className="text-muted-foreground mb-2 font-mono text-xs tabular-nums">
      Question {i + 1} of {QUESTION_ORDER.length}
    </p>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "border-border w-full rounded-sm border px-3 py-2 text-left text-sm transition-colors",
        selected ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

const SCENARIO_INSIGHT: Record<Q2, string> = {
  kids: "Once kids are in the mix, personal time doesn't disappear evenly — it quietly goes to whoever's less likely to ask for it back.",
  schedules:
    "Different schedules make it easy for one of you to quietly bank more “on duty” hours than the other, without either of you tracking it.",
  lonely:
    "Losing touch with people is common, and usually fixable with a little dedicated, guilt-free time — which is exactly what MyTO protects.",
  unaware:
    "That's the big one. MyTO's whole point is making that imbalance visible, so it's a fact you can both see instead of an argument you have to win.",
  none: "Fair enough — MyTO still helps with smaller imbalances; it just keeps things from drifting before they become a bigger deal.",
};

export function OnboardingQuiz({ onSignInInstead }: { onSignInInstead: () => void }) {
  const supabase = createClient();
  const [step, setStep] = useState<Step>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function afterQ3(q3: Q3) {
    const merged = { ...answers, q3 };
    const lowFit = merged.q1 === "no" || (merged.q2 === "none" && q3 === "week");
    setStep(lowFit ? "tour" : "q4");
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName: answers.name }),
    });
    const body = await res.json();
    if (!res.ok) {
      setSaving(false);
      toast.error(body.error ?? "Could not create account.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // One-time handoff so the onboarding step right after this doesn't ask
    // for the same name/household name again — read once and discarded.
    try {
      window.localStorage.setItem(
        "myto-quiz-prefill",
        JSON.stringify({ name: answers.name, householdName: answers.householdName }),
      );
    } catch {
      // Not worth failing signup over — onboarding just asks again.
    }
    window.location.href = "/dashboard";
  }

  if (step === "intro") {
    return (
      <div>
        <EscapeHatches onSignInInstead={onSignInInstead} />
        <p className="label-tag text-muted-foreground mb-2">Before you sign in</p>
        <h2 className="font-heading mb-2 text-2xl font-medium text-balance">
          Is MyTO actually for you?
        </h2>
        <p className="text-muted-foreground mb-5 text-sm">
          Answer a few quick questions — less than a minute — and we&apos;ll show you exactly how
          it&apos;d work for your household.
        </p>
        <Button className="w-full" onClick={() => setStep("q1")}>
          Let&apos;s find out
        </Button>
      </div>
    );
  }

  if (step === "q1") {
    return (
      <div>
        <EscapeHatches onSignInInstead={onSignInInstead} />
        <Progress step={step} />
        <h2 className="font-heading mb-4 text-xl font-medium text-balance">
          Do you share a household with a partner or spouse?
        </h2>
        <div className="space-y-2">
          <OptionButton
            selected={answers.q1 === "yes"}
            onClick={() => {
              set("q1", "yes");
              setStep("q2");
            }}
          >
            Yes
          </OptionButton>
          <OptionButton
            selected={answers.q1 === "no"}
            onClick={() => {
              set("q1", "no");
              setStep("q2");
            }}
          >
            Not right now
          </OptionButton>
        </div>
      </div>
    );
  }

  if (step === "q2") {
    const options: { value: Q2; label: string }[] = [
      { value: "kids", label: "Kids take up basically all our free time" },
      { value: "schedules", label: "We work really different schedules" },
      { value: "lonely", label: "I've lost touch with friends / feel isolated" },
      { value: "unaware", label: "My partner doesn't really see how lopsided it's gotten" },
      { value: "none", label: "None of these, honestly" },
    ];
    return (
      <div>
        <EscapeHatches onSignInInstead={onSignInInstead} />
        <Progress step={step} />
        <h2 className="font-heading mb-4 text-xl font-medium text-balance">
          Which of these sounds familiar?
        </h2>
        <div className="space-y-2">
          {options.map((o) => (
            <OptionButton
              key={o.value}
              selected={answers.q2 === o.value}
              onClick={() => {
                set("q2", o.value);
                setStep("q3");
              }}
            >
              {o.label}
            </OptionButton>
          ))}
        </div>
      </div>
    );
  }

  if (step === "q3") {
    const options: { value: Q3; label: string }[] = [
      { value: "week", label: "This week" },
      { value: "month", label: "This month" },
      { value: "long", label: "Longer than I'd like to admit" },
    ];
    return (
      <div>
        <EscapeHatches onSignInInstead={onSignInInstead} />
        <Progress step={step} />
        <h2 className="font-heading mb-4 text-xl font-medium text-balance">
          When did you last get real time to yourself — no kids, no chores, nobody needing
          anything?
        </h2>
        <div className="space-y-2">
          {options.map((o) => (
            <OptionButton
              key={o.value}
              selected={answers.q3 === o.value}
              onClick={() => afterQ3(o.value)}
            >
              {o.label}
            </OptionButton>
          ))}
        </div>
      </div>
    );
  }

  if (step === "tour") {
    return (
      <div>
        <EscapeHatches onSignInInstead={onSignInInstead} />
        <p className="label-tag text-muted-foreground mb-2">Good news</p>
        <h2 className="font-heading mb-2 text-2xl font-medium text-balance">
          Sounds like you&apos;ve got this figured out
        </h2>
        <p className="text-muted-foreground mb-5 text-sm">
          MyTO is built for two people trading off who gets a break — since that doesn&apos;t
          really sound like your situation right now, you probably don&apos;t need it. Take a
          look anyway, in case that changes:
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/demo" className={cn(buttonVariants(), "w-full")}>
            Try the demo
          </Link>
          <Link
            href="/how-it-works"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            See how it works
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setStep("q4")}
          className="text-muted-foreground hover:text-foreground mt-4 text-xs underline"
        >
          Set up an account anyway
        </button>
      </div>
    );
  }

  if (step === "q4") {
    const options = ["Sleep, uninterrupted", "See a friend", "A hobby, alone", "Just quiet"];
    return (
      <div>
        <EscapeHatches onSignInInstead={onSignInInstead} />
        <Progress step={step} />
        <h2 className="font-heading mb-4 text-xl font-medium text-balance">
          What would an actual free evening look like for you?
        </h2>
        {!answers.q4 ? (
          <div className="space-y-2">
            {options.map((o) => (
              <OptionButton key={o} selected={false} onClick={() => set("q4", o)}>
                {o}
              </OptionButton>
            ))}
          </div>
        ) : (
          <>
            <p className="bg-muted rounded-md p-3 text-sm">
              Whatever it is — that&apos;s exactly what MyTO protects. Log it, and your partner
              banks the credit for covering, automatically.
            </p>
            <Button className="mt-4 w-full" onClick={() => setStep("q5")}>
              Continue
            </Button>
          </>
        )}
      </div>
    );
  }

  if (step === "q5") {
    const options = [
      "We don't",
      "We just remember",
      "One of us mentally tallies it",
      "We've argued about it",
    ];
    return (
      <div>
        <EscapeHatches onSignInInstead={onSignInInstead} />
        <Progress step={step} />
        <h2 className="font-heading mb-4 text-xl font-medium text-balance">
          Right now, how do you keep track of who covered last?
        </h2>
        {!answers.q5 ? (
          <div className="space-y-2">
            {options.map((o) => (
              <OptionButton key={o} selected={false} onClick={() => set("q5", o)}>
                {o}
              </OptionButton>
            ))}
          </div>
        ) : (
          <>
            <p className="bg-muted rounded-md p-3 text-sm">
              That&apos;s the mental load MyTO takes off the table — one shared ledger you can
              both actually see, so nobody has to keep score in their head.
            </p>
            <Button className="mt-4 w-full" onClick={() => setStep("q6")}>
              Continue
            </Button>
          </>
        )}
      </div>
    );
  }

  if (step === "q6") {
    const options = ["Yes, definitely", "A little", "Not really"];
    return (
      <div>
        <EscapeHatches onSignInInstead={onSignInInstead} />
        <Progress step={step} />
        <h2 className="font-heading mb-4 text-xl font-medium text-balance">
          Ever feel guilty asking for a whole day away instead of just an evening?
        </h2>
        {!answers.q6 ? (
          <div className="space-y-2">
            {options.map((o) => (
              <OptionButton key={o} selected={false} onClick={() => set("q6", o)}>
                {o}
              </OptionButton>
            ))}
          </div>
        ) : (
          <>
            <p className="bg-muted rounded-md p-3 text-sm">
              MyTO already accounts for that — a full day off banks more credit than an evening,
              automatically. No guilt math required.
            </p>
            <Button className="mt-4 w-full" onClick={() => setStep("q7")}>
              Continue
            </Button>
          </>
        )}
      </div>
    );
  }

  if (step === "q7") {
    return (
      <div>
        <EscapeHatches onSignInInstead={onSignInInstead} />
        <Progress step={step} />
        <h2 className="font-heading mb-4 text-xl font-medium text-balance">
          Last thing — what should we call you and your household?
        </h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setStep("signup");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="quiz-name">Your name</Label>
            <Input
              id="quiz-name"
              value={answers.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quiz-household">Household name (optional)</Label>
            <Input
              id="quiz-household"
              value={answers.householdName ?? ""}
              onChange={(e) => set("householdName", e.target.value)}
              placeholder="Our Household"
            />
          </div>
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </div>
    );
  }

  // step === "signup"
  const scenarioLine = answers.q2 ? SCENARIO_INSIGHT[answers.q2] : null;
  return (
    <div>
      <EscapeHatches onSignInInstead={onSignInInstead} />
      <p className="label-tag text-muted-foreground mb-2">You&apos;re set</p>
      <h2 className="font-heading mb-2 text-2xl font-medium text-balance">
        Save your profile to lock this in
      </h2>
      <p className="text-muted-foreground mb-4 text-sm">
        {answers.name ? `${answers.name}, h` : "H"}ere&apos;s what happens next: you create an
        account, invite your partner (or log manually for now if they&apos;re not ready), and
        start banking real credit for {answers.q4 ? answers.q4.toLowerCase() : "your own time"}.
      </p>
      {scenarioLine && (
        <p className="bg-muted mb-4 rounded-md p-3 text-sm">{scenarioLine}</p>
      )}
      <form onSubmit={handleSaveProfile} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="quiz-email">Email</Label>
          <Input
            id="quiz-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quiz-password">Password</Label>
          <Input
            id="quiz-password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Save your profile"}
        </Button>
      </form>
    </div>
  );
}
