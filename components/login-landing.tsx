"use client";

import { useState } from "react";
import Link from "next/link";
import { MiniHowItWorks } from "@/components/how-it-works/mini-steps";
import { ImpactStats } from "@/components/impact-stats";
import { CoffeeLink } from "@/components/coffee-link";
import { HighContrastToggle } from "@/components/high-contrast-toggle";
import { AuthFooterLinks } from "@/components/brand/auth-shell";
import { OnboardingQuiz } from "@/components/onboarding-quiz";
import { JoinInvite } from "@/components/join-invite";
import { LoginForm } from "@/app/login/login-form";
import type { PublicStats } from "@/lib/stats";
import type { InvitePreview } from "@/lib/invite";

// Default view for a new visitor is the quiz; returning users can jump
// straight to the plain sign-in form instead of being walked through it
// every time. Someone who arrived via an actual invite link skips the
// quiz entirely — their partner already decided this is for them.
export function LoginLanding({
  stats,
  code,
  invite,
}: {
  stats: PublicStats;
  code?: string;
  invite: InvitePreview | null;
}) {
  const [mode, setMode] = useState<"quiz" | "classic">("quiz");

  if (code && invite) {
    return <JoinInvite code={code} invite={invite} />;
  }

  if (mode === "quiz") {
    return (
      <>
        {code && !invite && (
          <p className="border-warning bg-warning/10 text-warning mb-4 rounded-md border p-2 text-sm">
            That invite link isn&apos;t valid anymore — ask your partner to send a new one. In
            the meantime, here&apos;s MyTO:
          </p>
        )}
        <OnboardingQuiz onSignInInstead={() => setMode("classic")} />
      </>
    );
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
