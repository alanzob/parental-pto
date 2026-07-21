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
}: {
  me: Pick<Profile, "id" | "household_id" | "display_name">;
  household: Household;
  invitations: Invitation[];
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

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const feedUrl = `${origin}/api/feed/${feedToken}/feed.ics`;
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
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
            Peak hours use a 1.5x-style multiplier during a configurable
            window, resolved in your household&apos;s timezone.
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hh-tz">Timezone (IANA name)</Label>
              <Input
                id="hh-tz"
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                placeholder="America/New_York"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="overdraft">Overdraft floor (hours, negative)</Label>
              <Input
                id="overdraft"
                type="number"
                value={form.overdraft_floor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, overdraft_floor: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="multiplier">Peak multiplier</Label>
              <Input
                id="multiplier"
                type="number"
                step="0.1"
                value={form.peak_multiplier}
                onChange={(e) =>
                  setForm((f) => ({ ...f, peak_multiplier: e.target.value }))
                }
              />
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
            </div>

            <Separator className="sm:col-span-2" />

            <div className="flex items-center justify-between sm:col-span-2">
              <div>
                <Label htmlFor="uilf">Use-it-or-lose-it</Label>
                <p className="text-muted-foreground text-xs">
                  Expire unused balance after N days.
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
            Codes expire after 7 days and can only be used once.
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

      <Card>
        <CardHeader>
          <CardTitle>Calendar feed</CardTitle>
          <CardDescription>
            Subscribe from Google Calendar (&quot;Other calendars → From
            URL&quot;) or Apple Calendar (&quot;File → New Calendar
            Subscription&quot;). Calendar apps poll infrequently — new
            entries may take a few hours to show up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Subscribe URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={feedUrl} className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={() => copy(feedUrl)}>
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={() => copy(webcalUrl)}>
                Copy webcal://
              </Button>
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
