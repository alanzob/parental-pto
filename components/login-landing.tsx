"use client";

import { useState } from "react";
import Link from "next/link";
import { MiniHowItWorks } from "@/components/how-it-works/mini-steps";
import { ImpactStats } from "@/components/impact-stats";
import { CoffeeLink } from "@/components/coffee-link";
import { HighContrastToggle } from "@/components/high-contrast-toggle";
import { AuthFooterLinks } from "@/components/brand/auth-shell";
import { OnboardingQuiz } from "@/components/onboarding-quiz";
import { LoginForm } from "@/app/login/login-form";
import type { PublicStats } from "@/lib/stats";

// Default view for a new visitor is the quiz; returning users can jump
// straight to the plain sign-in form instead of being walked through it
// every time.
export function LoginLanding({ stats }: { stats: PublicStats }) {
  const [mode, setMode] = useState<"quiz" | "classic">("quiz");

  if (mode === "quiz") {
    return <OnboardingQuiz onSignInInstead={() => setMode("classic")} />;
  }

  return (
    <>
      <p className="label-tag text-muted-foreground mb-3">How it works</p>
      <MiniHowItWorks />
      <p className="text-muted-foreground mt-3 text-xs">
        <Link href="/how-it-works" className="hover:text-foreground underline">
          Read the full walkthrough
        </Link>
      </p>

      <div className="my-6 border-t" />

      <LoginForm />

      <ImpactStats stats={stats} className="mt-6" />

      <AuthFooterLinks>
        <Link href="/about" className="hover:text-foreground underline">
          About
        </Link>
        <HighContrastToggle />
        <CoffeeLink />
      </AuthFooterLinks>
    </>
  );
}
