"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/invite-code";
import { computeDuration } from "@/lib/duration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Phase = "setup" | "history";
type LoggedEntry = { title: string; fullDays: number; hours: number };

const ERROR_MESSAGES: Record<string, string> = {
  ALREADY_IN_HOUSEHOLD: "You already belong to a household.",
  ALREADY_HAS_PARTNER: "This household already has a second member.",
  INVALID_NAME: "Give your partner a name.",
  INVALID_TITLE: "Give this entry a name.",
  INVALID_WINDOW: "Back on duty must be after off duty starting.",
};

function friendlyError(message: string): string {
  const code = message.split(":")[0]?.trim();
  return ERROR_MESSAGES[code] ?? message;
}

function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function QuickStartFlow() {
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("setup");
  const [householdName, setHouseholdName] = useState("Our Household");
  const [myName, setMyName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [settingUp, setSettingUp] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [origin, setOrigin] = useState("");

  const [title, setTitle] = useState("");
  const [offDutyStart, setOffDutyStart] = useState(() => toLocalDatetimeInput(new Date()));
  const [backOnDuty, setBackOnDuty] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return toLocalDatetimeInput(d);
  });
  const [addingEntry, setAddingEntry] = useState(false);
  const [logged, setLogged] = useState<LoggedEntry[]>([]);

  async function setUpHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerName.trim()) {
      toast.error("Give your partner a name.");
      return;
    }
    setSettingUp(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSettingUp(false);
      toast.error("Not signed in.");
      return;
    }

    const { data: householdId, error: hhError } = await supabase.rpc("create_household", {
      p_name: householdName,
    });
    if (hhError || !householdId) {
      setSettingUp(false);
      toast.error(hhError ? friendlyError(hhError.message) : "Could not create household.");
      return;
    }

    if (myName.trim()) {
      await supabase.from("profiles").update({ display_name: myName.trim() }).eq("id", user.id);
    }

    const { error: partnerError } = await supabase.rpc("add_manual_partner", {
      p_name: partnerName.trim(),
    });
    if (partnerError) {
      setSettingUp(false);
      toast.error(friendlyError(partnerError.message));
      return;
    }

    const code = generateInviteCode();
    await supabase.from("invitations").insert({
      household_id: householdId,
      invite_code: code,
      created_by: user.id,
    });

    setInviteCode(code);
    setOrigin(window.location.origin);
    setSettingUp(false);
    setPhase("history");
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || backOnDuty <= offDutyStart) return;
    setAddingEntry(true);
    const { error } = await supabase.rpc("create_pto_request", {
      p_title: title.trim(),
      p_off_duty_start: new Date(offDutyStart).toISOString(),
      p_back_on_duty: new Date(backOnDuty).toISOString(),
    });
    setAddingEntry(false);
    if (error) {
      toast.error(friendlyError(error.message));
      return;
    }
    const { fullDays, hours } = computeDuration(offDutyStart, backOnDuty);
    setLogged((prev) => [...prev, { title: title.trim(), fullDays, hours }]);
    setTitle("");
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(`${origin}/onboarding/join?code=${inviteCode}`);
    toast.success("Copied.");
  }

  if (phase === "setup") {
    return (
      <form onSubmit={setUpHousehold} className="space-y-3 pt-2">
        <p className="text-muted-foreground text-sm">
          Set up both of you at once — we&apos;ll generate an invite link for your partner and
          let you start logging time right away, even before they&apos;ve joined.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="qs-household">Household name</Label>
          <Input
            id="qs-household"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="qs-my-name">Your name</Label>
            <Input
              id="qs-my-name"
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              placeholder="e.g. Sam"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qs-partner-name">Partner&apos;s name</Label>
            <Input
              id="qs-partner-name"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="e.g. Alex"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={settingUp}>
          {settingUp ? "Setting up…" : "Set up our household"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>Invite link for {partnerName}</Label>
        <div className="flex gap-2">
          <Input
            readOnly
            value={`${origin}/onboarding/join?code=${inviteCode}`}
            className="font-mono text-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={copyInviteLink}>
            Copy
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Send them this link whenever you&apos;re ready. Until they join, anything you log below
          is approved automatically — there&apos;s no one else here to check it yet.
        </p>
      </div>

      <div className="space-y-2 border-t pt-3">
        <Label>Log recent or upcoming time off</Label>
        <p className="text-muted-foreground text-xs">
          Anything from the last few months, or things already on the books — both count.
        </p>
        <form onSubmit={addEntry} className="space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Trip to Cali"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="datetime-local"
              value={offDutyStart}
              onChange={(e) => setOffDutyStart(e.target.value)}
              aria-label="Off duty starting"
            />
            <Input
              type="datetime-local"
              value={backOnDuty}
              onChange={(e) => setBackOnDuty(e.target.value)}
              aria-label="Back on duty"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={addingEntry || !title.trim()}
          >
            {addingEntry ? "Adding…" : "Add entry"}
          </Button>
        </form>
        {logged.length > 0 && (
          <ul className="space-y-1 pt-1 text-sm">
            {logged.map((l, i) => (
              <li key={i} className="text-muted-foreground">
                ✓ {l.title} — {l.fullDays > 0 ? `${l.fullDays}d ` : ""}
                {l.hours}h
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button className="w-full" onClick={() => (window.location.href = "/dashboard")}>
        {logged.length > 0 ? "Done — go to dashboard" : "Skip for now — go to dashboard"}
      </Button>
    </div>
  );
}
