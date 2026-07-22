"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/invite-code";
import type { Household, Invitation, Profile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export function SettingsClient({
  me,
  household,
  invitations,
  hasRealPartner,
}: {
  me: Pick<Profile, "id" | "household_id" | "display_name">;
  household: Household;
  invitations: Invitation[];
  hasRealPartner: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(me.display_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [form, setForm] = useState({
    name: household.name,
    timezone: household.timezone,
    overdraft_floor: String(household.overdraft_floor),
    peak_multiplier: String(household.peak_multiplier),
    peak_window_start: household.peak_window_start.slice(0, 5),
    peak_window_end: household.peak_window_end.slice(0, 5),
    use_it_or_lose_it_enabled: household.use_it_or_lose_it_enabled,
    use_it_or_lose_it_days: household.use_it_or_lose_it_days
      ? String(household.use_it_or_lose_it_days)
      : "",
  });
  const [savingHousehold, setSavingHousehold] = useState(false);

  const [feedToken, setFeedToken] = useState(household.calendar_feed_token);
  const [regenerating, setRegenerating] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const [manualPartnerName, setManualPartnerName] = useState(household.manual_partner_name ?? "");
  const [savingManualPartner, setSavingManualPartner] = useState(false);
  const [removingManualPartner, setRemovingManualPartner] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", me.id);
    setSavingProfile(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved.");
    router.refresh();
  }

  async function saveHousehold(e: React.FormEvent) {
    e.preventDefault();
    setSavingHousehold(true);
    const { error } = await supabase
      .from("households")
      .update({
        name: form.name,
        timezone: form.timezone,
        overdraft_floor: parseFloat(form.overdraft_floor) || 0,
        peak_multiplier: parseFloat(form.peak_multiplier) || 1,
        peak_window_start: form.peak_window_start,
        peak_window_end: form.peak_window_end,
        use_it_or_lose_it_enabled: form.use_it_or_lose_it_enabled,
        use_it_or_lose_it_days: form.use_it_or_lose_it_enabled
          ? parseInt(form.use_it_or_lose_it_days) || null
          : null,
      })
      .eq("id", household.id);
    setSavingHousehold(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Household settings saved.");
    router.refresh();
  }

  async function createInvite() {
    setGeneratingInvite(true);
    const { error } = await supabase.from("invitations").insert({
      household_id: household.id,
      invite_code: generateInviteCode(),
      created_by: me.id,
    });
    setGeneratingInvite(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.refresh();
  }

  async function revokeInvite(id: string) {
    const { error } = await supabase
      .from("invitations")
      .update({ status: "revoked" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.refresh();
  }

  async function regenerateFeed() {
    setRegenerating(true);
    const { data, error } = await supabase.rpc("regenerate_calendar_feed_token");
    setRegenerating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setFeedToken(data as string);
    toast.success("New link generated — update it in your calendar app.");
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied.");
  }

  async function saveManualPartner(e: React.FormEvent) {
    e.preventDefault();
    if (!manualPartnerName.trim()) return;
    setSavingManualPartner(true);
    const { error } = await supabase.rpc("add_manual_partner", {
      p_name: manualPartnerName.trim(),
    });
    setSavingManualPartner(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      household.partner_mode === "manual" ? "Updated." : "Added — requests will auto-approve.",
    );
    router.refresh();
  }

  async function removeManualPartner() {
    setRemovingManualPartner(true);
    const { error } = await supabase.rpc("remove_manual_partner");
    setRemovingManualPartner(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removed. Past history stays on the record.");
    router.refresh();
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const feedUrl = `${origin}/api/feed/${feedToken}/feed.ics`;
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>
            Your display name is what your partner sees throughout the app —
            on requests, in the comparative ledger, and on the calendar feed.
          </CardDescription>
        </CardHeader>
        <form onSubmit={saveProfile}>
          <CardContent className="space-y-1.5">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" size="sm" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Household settings</CardTitle>
          <CardDescription>
            These apply to both of you — either partner can change them.
          </CardDescription>
        </CardHeader>
        <form onSubmit={saveHousehold}>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hh-name">Household name</Label>
              <Input
                id="hh-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <p className="text-muted-foreground text-xs">
                Shown on your calendar feed and in emails, if you enable them.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hh-tz">Timezone (IANA name)</Label>
              <Input
                id="hh-tz"
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                placeholder="America/New_York"
              />
              <p className="text-muted-foreground text-xs">
                Used to resolve the peak window below — e.g.
                &quot;America/New_York&quot; or &quot;Europe/London&quot;.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="multiplier">Peak-hour multiplier</Label>
              <Input
                id="multiplier"
                type="number"
                step="0.1"
                value={form.peak_multiplier}
                onChange={(e) =>
                  setForm((f) => ({ ...f, peak_multiplier: e.target.value }))
                }
              />
              <p className="text-muted-foreground text-xs">
                E.g. 1.5 means a request starting in the peak window below
                credits 1.5x the hours (a &quot;premium&quot; for asking
                during the harder overnight/bedtime stretch).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="overdraft">Overdraft floor (hours)</Label>
              <Input
                id="overdraft"
                type="number"
                value={form.overdraft_floor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, overdraft_floor: e.target.value }))
                }
              />
              <p className="text-muted-foreground text-xs">
                Currently unused by the request-approval flow — reserved for
                a future spend/redeem feature.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="peak-start">Peak window start</Label>
              <Input
                id="peak-start"
                type="time"
                value={form.peak_window_start}
                onChange={(e) =>
                  setForm((f) => ({ ...f, peak_window_start: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="peak-end">Peak window end</Label>
              <Input
                id="peak-end"
                type="time"
                value={form.peak_window_end}
                onChange={(e) =>
                  setForm((f) => ({ ...f, peak_window_end: e.target.value }))
                }
              />
              <p className="text-muted-foreground text-xs">
                A request &quot;off duty starting&quot; inside this window
                (e.g. bedtime) gets the multiplier above.
              </p>
            </div>

            <Separator className="sm:col-span-2" />

            <div className="flex items-center justify-between sm:col-span-2">
              <div>
                <Label htmlFor="uilf">Use-it-or-lose-it</Label>
                <p className="text-muted-foreground text-xs">
                  Expire banked balance after N days if it isn&apos;t used.
                  Off by default — banked time never expires.
                </p>
              </div>
              <Switch
                id="uilf"
                checked={form.use_it_or_lose_it_enabled}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, use_it_or_lose_it_enabled: checked }))
                }
              />
            </div>
            {form.use_it_or_lose_it_enabled && (
              <div className="space-y-1.5">
                <Label htmlFor="uilf-days">Days until expiry</Label>
                <Input
                  id="uilf-days"
                  type="number"
                  value={form.use_it_or_lose_it_days}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, use_it_or_lose_it_days: e.target.value }))
                  }
                />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" size="sm" disabled={savingHousehold}>
              {savingHousehold ? "Saving…" : "Save household settings"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite your partner</CardTitle>
          <CardDescription>
            A household is exactly two people. Generate a one-time code,
            send them the link, and they&apos;re in — codes expire after 7
            days and can only be used once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invitations.length === 0 && (
            <p className="text-muted-foreground text-sm">No invites yet.</p>
          )}
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-2 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-sm">{inv.invite_code}</p>
                <Badge
                  variant={
                    inv.status === "pending"
                      ? "default"
                      : inv.status === "accepted"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {inv.status}
                </Badge>
              </div>
              {inv.status === "pending" && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      copy(`${origin}/onboarding/join?code=${inv.invite_code}`)
                    }
                  >
                    Copy link
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => revokeInvite(inv.id)}
                  >
                    Revoke
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button size="sm" onClick={createInvite} disabled={generatingInvite}>
            {generatingInvite ? "Generating…" : "Generate invite"}
          </Button>
        </CardFooter>
      </Card>

      {!hasRealPartner && (
        <Card className={household.partner_mode === "manual" ? "" : "border-dashed"}>
          <CardHeader>
            <CardTitle>
              {household.partner_mode === "manual"
                ? "Manual partner"
                : "Or, add them manually instead"}
            </CardTitle>
            <CardDescription>
              {household.partner_mode === "manual" ? (
                <>
                  You&apos;re tracking time on behalf of{" "}
                  <strong className="text-foreground font-medium">
                    {household.manual_partner_name}
                  </strong>{" "}
                  without them using the app. Requests bank automatically, since there&apos;s no
                  one else here to approve them — a less complete way to use this tool, since
                  your partner isn&apos;t actually weighing in, but still useful for noticing a
                  pattern and making the case for time to yourself. For the full experience —
                  real approvals, not auto-approval — invite them for real with the code above
                  whenever they&apos;re ready.
                </>
              ) : (
                "If your partner isn't going to use Parental PTO, you can still track time on their behalf. It's a less optimal way to use this — there's no one to actually check your requests, so they bank automatically — but it can still be a useful tool for noticing patterns in a healthy relationship."
              )}
            </CardDescription>
          </CardHeader>
          <form onSubmit={saveManualPartner}>
            <CardContent className="space-y-1.5">
              <Label htmlFor="manual-partner-name">Their name</Label>
              <Input
                id="manual-partner-name"
                value={manualPartnerName}
                onChange={(e) => setManualPartnerName(e.target.value)}
                placeholder="e.g. Alex"
              />
            </CardContent>
            <CardFooter className="gap-2">
              <Button type="submit" size="sm" disabled={savingManualPartner}>
                {savingManualPartner
                  ? "Saving…"
                  : household.partner_mode === "manual"
                    ? "Update name"
                    : "Add manually"}
              </Button>
              {household.partner_mode === "manual" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeManualPartner}
                  disabled={removingManualPartner}
                >
                  {removingManualPartner ? "Removing…" : "Remove"}
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Calendar feed</CardTitle>
          <CardDescription>
            A private link — anyone who has it can view your household&apos;s
            approved time off, so treat it like a password and regenerate it
            if it ever leaks. Subscribe from Google Calendar
            (&quot;Other calendars → From URL&quot;) or Apple Calendar
            (&quot;File → New Calendar Subscription&quot;). Calendar apps
            poll infrequently — new entries may take a few hours to show up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Subscribe URL</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={feedUrl} className="font-mono text-xs" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(feedUrl)}
                  className="flex-1 sm:flex-none"
                >
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(webcalUrl)}
                  className="flex-1 sm:flex-none"
                >
                  Copy webcal://
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="destructive"
            size="sm"
            onClick={regenerateFeed}
            disabled={regenerating}
          >
            {regenerating ? "Regenerating…" : "Regenerate link"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
