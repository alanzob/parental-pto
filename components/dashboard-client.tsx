"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Household, PtoBalance, PtoTransaction } from "@/lib/types";
import { BalanceCards } from "@/components/balance-cards";
import { RequestsList } from "@/components/requests-list";
import { RequestPtoDialog } from "@/components/request-pto-dialog";
import { PtoCalendarHeatmap, type HeatmapEntry } from "@/components/pto/calendar-heatmap";
import { ComparativeStats, type StatRow } from "@/components/pto/comparative-stats";
import { BalanceDisparityChart } from "@/components/pto/balance-disparity-chart";
import { SeriesControls, type SeriesSummary } from "@/components/pto/series-controls";
import { computeDisparitySeries, type DisparityEvent } from "@/lib/pto/disparity";
import type { Frequency } from "@/lib/pto/recurrence";
import { formatPoints, type OffCategory } from "@/lib/pto/categories";
import { tripCalendarEntries, type TripPeriod } from "@/lib/pto/trip";
import { CalendarFeedCallout } from "@/components/calendar-feed-callout";
import { ResearchNotesWidget } from "@/components/pto/research-notes-widget";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type PersonRef = { id: string | null; display_name: string | null };

function toDateInputLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function DashboardClient({
  me,
  partner,
  household,
  balances,
  requests,
}: {
  me: PersonRef;
  partner: PersonRef | null;
  household: Household;
  balances: PtoBalance[];
  requests: PtoTransaction[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestNonce, setRequestNonce] = useState(0);
  const [editing, setEditing] = useState<PtoTransaction | null>(null);

  const myBalance = balances.find((b) => b.user_id === me.id)?.current_balance ?? 0;
  const partnerBalance = partner
    ? (balances.find((b) => b.user_id === partner.id)?.current_balance ?? 0)
    : 0;

  const pendingForMe = requests.filter((r) => r.status === "pending" && r.user_id === me.id);
  const myPendingRequests = requests.filter(
    (r) => r.status === "pending" && r.initiated_by === me.id,
  );

  const calendarEntries = useMemo<HeatmapEntry[]>(() => {
    if (!partner) return [];
    const entries: HeatmapEntry[] = [];
    for (const r of requests) {
      if (r.status !== "approved" || !r.category) continue;
      const person = r.initiated_by === me.id ? ("a" as const) : ("b" as const);
      if (r.category === "trip" && r.departure_period && r.return_period) {
        const start = new Date(r.occurred_at);
        const end = new Date(start.getTime() + r.base_hours * 60 * 60 * 1000);
        const trip = tripCalendarEntries(
          toDateInputLocal(start),
          r.departure_period,
          toDateInputLocal(end),
          r.return_period,
        );
        for (const t of trip) {
          const [y, m, d] = t.date.split("-").map(Number);
          entries.push({ date: new Date(y, m - 1, d), category: t.category, person });
        }
      } else {
        // 'custom' has no fixed daily window of its own — render it like a
        // full day off, same as the calendar/ICS placement it was given.
        const band: OffCategory = r.category === "custom" ? "day" : (r.category as OffCategory);
        entries.push({ date: new Date(r.occurred_at), category: band, person });
      }
    }
    return entries;
  }, [requests, me.id, partner]);

  const statsRows = useMemo<StatRow[]>(() => {
    if (!partner) return [];
    const countBy = (userId: string | null, field: "initiated_by" | "user_id", status: string) =>
      requests.filter((r) => r[field] === userId && r.status === status).length;

    const pointsOffFor = (userId: string | null) =>
      requests
        .filter((r) => r.initiated_by === userId && r.status === "approved")
        .reduce((sum, r) => sum + r.final_cost, 0);

    return [
      {
        label: "MY TIME TAKEN (APPROVED)",
        a: formatPoints(pointsOffFor(me.id)),
        b: formatPoints(pointsOffFor(partner.id)),
      },
      {
        label: "CURRENT BANK BALANCE",
        a: formatPoints(myBalance),
        b: formatPoints(partnerBalance),
      },
      {
        label: "REQUESTS APPROVED",
        a: String(countBy(me.id, "initiated_by", "approved")),
        b: String(countBy(partner.id, "initiated_by", "approved")),
      },
      {
        label: "REQUESTS DENIED",
        a: String(countBy(me.id, "initiated_by", "denied")),
        b: String(countBy(partner.id, "initiated_by", "denied")),
      },
      {
        label: "AWAITING THEIR APPROVAL",
        a: String(countBy(me.id, "initiated_by", "pending")),
        b: String(countBy(partner.id, "initiated_by", "pending")),
      },
    ];
  }, [requests, me.id, partner, myBalance, partnerBalance]);

  const disparityPoints = useMemo(() => {
    if (!partner) return [];
    const events: DisparityEvent[] = requests
      .filter((r) => r.status === "approved")
      .map((r) => ({
        date: new Date(r.occurred_at),
        hours: r.final_cost,
        favorsB: r.user_id === partner.id,
      }));
    return computeDisparitySeries(events);
  }, [requests, partner]);

  const seriesSummaries = useMemo<SeriesSummary[]>(() => {
    const now = new Date().getTime();
    const groups = new Map<string, PtoTransaction[]>();
    for (const r of requests) {
      if (!r.series_id) continue;
      const arr = groups.get(r.series_id);
      if (arr) arr.push(r);
      else groups.set(r.series_id, [r]);
    }
    return Array.from(groups.entries()).map(([seriesId, items]) => {
      const first = items[0];
      const pending = items.filter((i) => i.status === "pending").length;
      const futureRemaining = items.filter(
        (i) =>
          (i.status === "pending" || i.status === "approved") &&
          new Date(i.occurred_at).getTime() > now,
      ).length;
      return {
        seriesId,
        title: first.title,
        total: items.length,
        pending,
        futureRemaining,
        canRespond: first.user_id === me.id && pending > 0,
        canManage: first.initiated_by === me.id || (first.initiated_by === null && partner?.id === null),
      };
    });
  }, [requests, me.id, partner]);

  const statsFooter = partner
    ? `Δ ${formatPoints(Math.abs(partnerBalance - myBalance))} ${
        partnerBalance - myBalance >= 0
          ? `favoring ${partner.display_name ?? "partner"}`
          : "favoring you"
      }`
    : undefined;

  async function submitRequest(input: {
    title: string;
    offDutyStart: string;
    backOnDuty: string;
    category: OffCategory | "trip" | "custom";
    departurePeriod: TripPeriod | null;
    returnPeriod: TripPeriod | null;
    departureDate: string | null;
    returnDate: string | null;
    customWeight: number | null;
    note: string;
    frequency: Frequency;
    endsBy: string | null;
    forPartner: boolean;
  }) {
    if (input.frequency !== "none" && input.endsBy) {
      const { data, error } = await supabase.rpc("create_recurring_pto_request", {
        p_title: input.title,
        p_first_off_duty_start: input.offDutyStart,
        p_first_back_on_duty: input.backOnDuty,
        p_category: input.category,
        p_frequency: input.frequency,
        p_ends_by: new Date(`${input.endsBy}T23:59:59`).toISOString(),
        p_note: input.note || null,
        p_for_partner: input.forPartner,
        p_custom_weight: input.customWeight,
      });
      if (error) {
        toast.error(friendlyRpcError(error.message));
        return false;
      }
      const n = typeof data === "number" ? data : 0;
      toast.success(
        input.forPartner
          ? `${n} entries logged and banked to you.`
          : household.partner_mode === "manual"
            ? `${n} requests logged and banked.`
            : `${n} requests sent to ${partner?.display_name ?? "your partner"} for approval.`,
      );
      router.refresh();
      return true;
    }

    const { error } = await supabase.rpc("create_pto_request", {
      p_title: input.title,
      p_off_duty_start: input.offDutyStart,
      p_back_on_duty: input.backOnDuty,
      p_category: input.category,
      p_note: input.note || null,
      p_for_partner: input.forPartner,
      p_departure_period: input.departurePeriod,
      p_return_period: input.returnPeriod,
      p_departure_date: input.departureDate,
      p_return_date: input.returnDate,
      p_custom_weight: input.customWeight,
    });
    if (error) {
      toast.error(friendlyRpcError(error.message));
      return false;
    }
    toast.success(
      input.forPartner
        ? "Logged and banked to you — no approval needed."
        : household.partner_mode === "manual"
          ? "Logged and banked — approved automatically, since it's just you tracking this."
          : partner
            ? `Sent to ${partner.display_name ?? "your partner"} for approval.`
            : "Request submitted.",
    );
    router.refresh();
    return true;
  }

  async function respondToRequest(id: string, approve: boolean) {
    const { error } = await supabase.rpc(
      approve ? "approve_pto_request" : "deny_pto_request",
      { p_transaction_id: id },
    );
    if (error) {
      toast.error(friendlyRpcError(error.message));
      return;
    }
    toast.success(approve ? "Approved." : "Denied.");
    router.refresh();
  }

  async function submitEdit(input: {
    title: string;
    offDutyStart: string;
    backOnDuty: string;
    category: OffCategory | "trip" | "custom";
    departurePeriod: TripPeriod | null;
    returnPeriod: TripPeriod | null;
    departureDate: string | null;
    returnDate: string | null;
    customWeight: number | null;
    note: string;
    frequency: Frequency;
    endsBy: string | null;
    forPartner: boolean;
  }) {
    if (!editing) return false;
    const wasApproved = editing.status === "approved";
    const { data, error } = await supabase.rpc("edit_pto_request", {
      p_transaction_id: editing.id,
      p_title: input.title,
      p_off_duty_start: input.offDutyStart,
      p_back_on_duty: input.backOnDuty,
      p_category: input.category,
      p_note: input.note || null,
      p_departure_period: input.departurePeriod,
      p_return_period: input.returnPeriod,
      p_departure_date: input.departureDate,
      p_return_date: input.returnDate,
      p_custom_weight: input.customWeight,
    });
    if (error) {
      toast.error(friendlyRpcError(error.message));
      return false;
    }
    const nowPending = wasApproved && data?.status === "pending";
    toast.success(
      nowPending
        ? `Updated — sent back to ${partner?.display_name ?? "your partner"} for re-approval.`
        : "Request updated.",
    );
    router.refresh();
    return true;
  }

  async function cancelRequest(request: PtoTransaction) {
    const { error } = await supabase.rpc("cancel_pto_request", {
      p_transaction_id: request.id,
    });
    if (error) {
      toast.error(friendlyRpcError(error.message));
      return;
    }
    toast.success(
      request.status === "approved"
        ? `Cancelled — ${formatPoints(request.final_cost)} removed.`
        : "Request cancelled.",
    );
    router.refresh();
  }

  async function respondSeries(seriesId: string, approve: boolean) {
    const { error } = await supabase.rpc("respond_pto_series", {
      p_series_id: seriesId,
      p_approve: approve,
    });
    if (error) {
      toast.error(friendlyRpcError(error.message));
      return;
    }
    toast.success(approve ? "Whole series approved." : "Whole series denied.");
    router.refresh();
  }

  async function cancelSeries(seriesId: string) {
    const { error } = await supabase.rpc("cancel_pto_series", { p_series_id: seriesId });
    if (error) {
      toast.error(friendlyRpcError(error.message));
      return;
    }
    toast.success("Remaining requests in the series cancelled.");
    router.refresh();
  }

  async function shiftSeries(seriesId: string, days: number) {
    const { error } = await supabase.rpc("reschedule_pto_series", {
      p_series_id: seriesId,
      p_shift_days: days,
    });
    if (error) {
      toast.error(friendlyRpcError(error.message));
      return;
    }
    toast.success(`Remaining requests moved ${days > 0 ? "+" : ""}${days} days.`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {!partner && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Waiting on your partner</CardTitle>
            <CardDescription>
              Invite them from Settings so you can both track balances and
              approve requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/settings"
              className={buttonVariants({ size: "sm" })}
            >
              Go to Settings
            </Link>
          </CardContent>
        </Card>
      )}

      {household.partner_mode === "manual" && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>
              Tracking solo, on{" "}
              <span className="text-foreground font-medium">
                {partner?.display_name ?? "your partner"}
              </span>
              &apos;s behalf
            </CardTitle>
            <CardDescription>
              <span className="text-foreground font-medium">
                {partner?.display_name ?? "Your partner"}
              </span>{" "}
              isn&apos;t on MyTO, so your requests bank automatically — there&apos;s no one else
              here to weigh in. It&apos;s a lighter way to use it, but still a good way to spot the
              pattern and make the case for time to be you.{" "}
              <Link href="/dashboard/settings" className="underline">
                Invite them for real
              </Link>{" "}
              whenever they&apos;re ready — it&apos;s better together.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setRequestOpen(true);
            setRequestNonce((n) => n + 1);
          }}
          disabled={!partner}
        >
          Claim My Time
        </Button>
        <a href="#activity" className={buttonVariants({ variant: "outline" })}>
          View activity
        </a>
      </div>

      {pendingForMe.length > 0 && (
        <div className="border-primary bg-accent border p-3 text-sm">
          {pendingForMe.length} request{pendingForMe.length > 1 ? "s" : ""} waiting
          on your approval below.
        </div>
      )}

      <BalanceCards partner={partner} myBalance={myBalance} partnerBalance={partnerBalance} />

      <ResearchNotesWidget />

      {partner && (
        <ComparativeStats
          labelA="You"
          labelB={partner.display_name ?? "Partner"}
          rows={statsRows}
          footer={statsFooter}
        />
      )}

      {partner && (
        <BalanceDisparityChart
          points={disparityPoints}
          labelA="You"
          labelB={partner.display_name ?? "Partner"}
        />
      )}

      <SeriesControls
        series={seriesSummaries}
        onRespond={respondSeries}
        onCancel={cancelSeries}
        onShift={shiftSeries}
      />

      <div id="activity" className="scroll-mt-4">
        <h2 className="label-tag mb-2">Recent activity</h2>
        {myPendingRequests.length > 0 && (
          <p className="text-muted-foreground mb-2 text-xs">
            {myPendingRequests.length} request{myPendingRequests.length > 1 ? "s" : ""}{" "}
            awaiting your partner&apos;s approval.
          </p>
        )}
        <RequestsList
          requests={requests}
          me={me}
          partner={partner}
          onRespond={respondToRequest}
          onEdit={setEditing}
          onCancel={cancelRequest}
        />
      </div>

      {partner && (
        <PtoCalendarHeatmap
          entries={calendarEntries}
          labelA="You"
          labelB={partner.display_name ?? "Partner"}
        />
      )}

      <CalendarFeedCallout feedToken={household.calendar_feed_token} />

      {partner && (
        <RequestPtoDialog
          key={requestNonce}
          household={household}
          partnerName={partner.display_name ?? "your partner"}
          open={requestOpen}
          onOpenChange={setRequestOpen}
          onSubmit={submitRequest}
        />
      )}

      {editing && (
        <RequestPtoDialog
          key={`edit-${editing.id}`}
          mode="edit"
          wasApproved={editing.status === "approved"}
          initial={{
            title: editing.title,
            date: toDateInputLocal(new Date(editing.occurred_at)),
            endDate: toDateInputLocal(
              new Date(new Date(editing.occurred_at).getTime() + editing.base_hours * 60 * 60 * 1000),
            ),
            category: (editing.category ?? "evening") as OffCategory | "trip" | "custom",
            departurePeriod: editing.departure_period ?? undefined,
            returnPeriod: editing.return_period ?? undefined,
            customWeight: editing.custom_weight,
            note: editing.note ?? "",
          }}
          household={household}
          partnerName={partner?.display_name ?? "your partner"}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSubmit={submitEdit}
        />
      )}
    </div>
  );
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  SELF_APPROVAL_BLOCKED: "You can't approve or deny your own request.",
  ALREADY_RESOLVED: "That request was already handled.",
  NO_PARTNER: "Invite your partner before claiming My Time.",
  INVALID_TITLE: "Give this request a name.",
  INVALID_CATEGORY: "Pick a time-off category.",
  NOT_YOURS: "Only the person who made a request can change it.",
  RESOLVED: "Only pending or approved requests can be edited.",
  ALREADY_CANCELLED: "That request is already cancelled.",
  NOT_FOUND: "That request no longer exists.",
  FORBIDDEN: "That request isn't in your household.",
};

function friendlyRpcError(message: string): string {
  const code = message.split(":")[0]?.trim();
  return RPC_ERROR_MESSAGES[code] ?? message;
}
