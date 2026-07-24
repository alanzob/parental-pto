"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { InvitePreview } from "@/lib/invite";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: "That invite link doesn't work anymore. Ask your partner to send a new one.",
  CODE_ALREADY_USED: "This invite link has already been used.",
  CODE_EXPIRED: "This invite link has expired — ask your partner to send a new one.",
  ALREADY_IN_HOUSEHOLD: "You already belong to a household.",
  HOUSEHOLD_FULL: "This household already has two members.",
};

function friendlyError(message: string): string {
  const code = message.split(":")[0]?.trim();
  return ERROR_MESSAGES[code] ?? message;
}

// Reached only when the login page resolved a real, still-pending invite
// code — someone was actually invited, so they skip the generic "is this
// for you" quiz entirely and land here instead.
export function JoinInvite({ code, invite }: { code: string; invite: InvitePreview }) {
  const supabase = createClient();
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function redeemAndGo() {
    const { error } = await supabase.rpc("redeem_invite", { p_invite_code: code });
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error.message));
      return;
    }
    toast.success(`You're in! Welcome to ${invite.householdName}.`);
    window.location.href = "/dashboard";
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName: name }),
    });
    const body = await res.json();
    if (!res.ok) {
      setSaving(false);
      toast.error(body.error ?? "Could not create account.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }
    await redeemAndGo();
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }
    await redeemAndGo();
  }

  return (
    <div>
      <p className="label-tag text-muted-foreground mb-2">You&apos;re invited</p>
      <h2 className="font-heading mb-2 text-2xl font-medium text-balance">
        Join {invite.householdName}
      </h2>
      <p className="text-muted-foreground mb-5 text-sm">
        {invite.inviterName ? `${invite.inviterName} invited` : "You've been invited"} you to
        MyTO — set up your own account and you&apos;ll be paired with{" "}
        {invite.inviterName ?? "them"} right away.
      </p>

      {mode === "create" ? (
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="join-name">Your name</Label>
            <Input
              id="join-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="join-email">Email</Label>
            <Input
              id="join-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="join-password">Password</Label>
            <Input
              id="join-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Joining…" : `Join ${invite.householdName}`}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSignIn} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="join-signin-email">Email</Label>
            <Input
              id="join-signin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="join-signin-password">Password</Label>
            <Input
              id="join-signin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Joining…" : "Sign in and join"}
          </Button>
        </form>
      )}

      <button
        type="button"
        onClick={() => setMode(mode === "create" ? "signin" : "create")}
        className="text-muted-foreground hover:text-foreground mt-4 text-xs underline"
      >
        {mode === "create" ? "Already on MyTO? Sign in instead" : "New here? Create an account"}
      </button>
    </div>
  );
}
