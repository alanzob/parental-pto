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
import { CalendarFeedCallout } from "@/components/calendar-feed-callout";
import { ResearchNotesWidget } from "@/components/pto/research-notes-widget";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type PersonRef = { id: string; display_name: string | null };

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
    return requests
      .filter((r) => r.status === "approved")
      .map((r) => {
        const start = new Date(r.occurred_at);
        const end = new Date(start.getTime() + r.base_hours * 60 * 60 * 1000);
        return {
          start,
          end,
          person: r.initiated_by === me.id ? ("a" as const) : ("b" as const),
        };
      });
  }, [requests, me.id, partner]);

  const statsRows = useMemo<StatRow[]>(() => {
    if (!partner) return [];
    const countBy = (userId: string, field: "initiated_by" | "user_id", status: string) =>
      requests.filter((r) => r[field] === userId && r.status === status).length;

    const hoursOffFor = (userId: string) =>
      requests
        .filter((r) => r.initiated_by === userId && r.status === "approved")
        .reduce((sum, r) => sum + r.base_hours, 0);

    return [
      {
        label: "TIME OFF DUTY (APPROVED)",
        a: `${hoursOffFor(me.id).toFixed(1)}H`,
        b: `${hoursOffFor(partner.id).toFixed(1)}H`,
      },
      {
        label: "CURRENT BANK BALANCE",
        a: `${myBalance.toFixed(1)}H`,
        b: `${partnerBalance.toFixed(1)}H`,
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

  const statsFooter = partner
    ? `Δ ${Math.abs(partnerBalance - myBalance).toFixed(1)}H ${
        partnerBalance - myBalance >= 0
          ? `favoring ${partner.display_name ?? "partner"}`
          : "favoring you"
      }`
    : undefined;

  async function submitRequest(input: {
    title: string;
    offDutyStart: string;
    backOnDuty: string;
    note: string;
  }) {
    const { error } = await supabase.rpc("create_pto_request", {
      p_title: input.title,
      p_off_duty_start: input.offDutyStart,
      p_back_on_duty: input.backOnDuty,
      p_note: input.note || null,
    });
    if (error) {
      toast.error(friendlyRpcError(error.message));
      return false;
    }
    toast.success(
      partner
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

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setRequestOpen(true);
            setRequestNonce((n) => n + 1);
          }}
          disabled={!partner}
        >
          Request time off
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

      <div id="activity" className="scroll-mt-4">
        <h2 className="label-tag mb-2">Recent activity</h2>
        {myPendingRequests.length > 0 && (
          <p className="text-muted-foreground mb-2 text-xs">
            {myPendingRequests.length} request{myPendingRequests.length > 1 ? "s" : ""}{" "}
            awaiting your partner&apos;s approval.
          </p>
        )}
        <RequestsList requests={requests} me={me} partner={partner} onRespond={respondToRequest} />
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
    </div>
  );
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  SELF_APPROVAL_BLOCKED: "You can't approve or deny your own request.",
  ALREADY_RESOLVED: "That request was already handled.",
  NO_PARTNER: "Invite your partner before requesting time off.",
  INVALID_TITLE: "Give this request a name.",
  INVALID_WINDOW: "Back on duty must be after off duty starting.",
};

function friendlyRpcError(message: string): string {
  const code = message.split(":")[0]?.trim();
  return RPC_ERROR_MESSAGES[code] ?? message;
}
