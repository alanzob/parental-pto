"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/brand/auth-shell";
import { QuickStartFlow } from "./quick-start-flow";
import { toast } from "sonner";
import type { InvitePreview } from "@/lib/invite";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: "That invite code doesn't exist. Double-check it with your partner.",
  CODE_ALREADY_USED: "This invite link has already been used.",
  CODE_EXPIRED: "This invite link has expired — ask your partner to send a new one.",
  ALREADY_IN_HOUSEHOLD: "You already belong to a household.",
  HOUSEHOLD_FULL: "This household already has two members.",
};

function friendlyError(message: string): string {
  const code = message.split(":")[0]?.trim();
  return ERROR_MESSAGES[code] ?? message;
}

function JoinForm({
  code,
  setCode,
  heading,
  body,
  submitLabel,
}: {
  code: string;
  setCode: (v: string) => void;
  heading: string;
  body: string;
  submitLabel: string;
}) {
  const supabase = createClient();
  const [joining, setJoining] = useState(false);

  async function joinHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setJoining(true);
    const { error } = await supabase.rpc("redeem_invite", { p_invite_code: code.trim() });
    setJoining(false);
    if (error) {
      toast.error(friendlyError(error.message));
      return;
    }
    toast.success("You're in! Welcome to the household.");
    window.location.href = "/dashboard";
  }

  return (
    <div>
      <p className="label-tag text-muted-foreground mb-2">Set up</p>
      <h2 className="font-heading mb-1 text-2xl font-medium text-balance">{heading}</h2>
      <p className="text-muted-foreground mb-5 text-sm">{body}</p>
      <form onSubmit={joinHousehold} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="invite-code">Invite code</Label>
          <Input
            id="invite-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste the code your partner sent"
          />
        </div>
        <Button type="submit" className="w-full" disabled={joining}>
          {joining ? "Joining…" : submitLabel}
        </Button>
      </form>
    </div>
  );
}

export function OnboardingForm({
  initialCode,
  invite,
}: {
  initialCode?: string;
  invite: InvitePreview | null;
}) {
  const [code, setCode] = useState(initialCode ?? "");
  const [showJoin, setShowJoin] = useState(false);

  // A real, still-pending invite code — skip everything else and go
  // straight to a personalized "Join The Walsh Household" form.
  if (initialCode && invite) {
    return (
      <AuthShell spec={["Step 1 of 1", "Pair your household", "Two people, one ledger"]}>
        <JoinForm
          code={code}
          setCode={setCode}
          heading={`Join ${invite.householdName}`}
          body={
            invite.inviterName
              ? `${invite.inviterName} invited you — confirm the code below to join.`
              : "Confirm the code below to join their household."
          }
          submitLabel={`Join ${invite.householdName}`}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell spec={["Step 1 of 1", "Pair your household", "Two people, one ledger"]}>
      {initialCode && !invite && (
        <p className="border-warning bg-warning/10 text-warning mb-4 rounded-md border p-2 text-sm">
          That invite link isn&apos;t valid anymore — ask your partner to send a new one, or set
          up your own household below.
        </p>
      )}
      {showJoin ? (
        <>
          <JoinForm
            code={code}
            setCode={setCode}
            heading="Join a household"
            body="Paste the invite code your partner sent you."
            submitLabel="Join household"
          />
          <button
            type="button"
            onClick={() => setShowJoin(false)}
            className="text-muted-foreground hover:text-foreground mt-4 text-xs underline"
          >
            Back to setting up my own household
          </button>
        </>
      ) : (
        <>
          <p className="label-tag text-muted-foreground mb-2">Set up</p>
          <h2 className="font-heading mb-1 text-2xl font-medium">Set up your household</h2>
          <QuickStartFlow />
          <button
            type="button"
            onClick={() => setShowJoin(true)}
            className="text-muted-foreground hover:text-foreground mt-4 text-xs underline"
          >
            Have an invite code instead?
          </button>
        </>
      )}
    </AuthShell>
  );
}
