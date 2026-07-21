"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PTO_CATEGORIES, type PtoCategory } from "@/lib/pto/categories";
import type { Household, PtoBalance, PtoConversion, PtoTransaction } from "@/lib/types";
import { useChudMode } from "@/components/chud-mode-provider";
import { BalanceCard } from "@/components/balance-card";
import { ApprovalInbox } from "@/components/approval-inbox";
import { TransactionsList } from "@/components/transactions-list";
import { ConversionDialog } from "@/components/conversion-dialog";
import { RequestPtoDialog } from "@/components/request-pto-dialog";
import { PtoCalendarHeatmap, type HeatmapEntry } from "@/components/pto/calendar-heatmap";
import { ComparativeStats, type StatRow } from "@/components/pto/comparative-stats";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type PersonRef = { id: string; display_name: string | null };

export function DashboardClient({
  me,
  partner,
  household,
  balances,
  transactions,
  conversions,
}: {
  me: PersonRef;
  partner: PersonRef | null;
  household: Household;
  balances: PtoBalance[];
  transactions: PtoTransaction[];
  conversions: PtoConversion[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const { enabled: chudMode } = useChudMode();

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestDefaultCategory, setRequestDefaultCategory] = useState<PtoCategory | null>(null);
  const [requestNonce, setRequestNonce] = useState(0);
  const [conversionOpen, setConversionOpen] = useState(false);
  const [conversionNonce, setConversionNonce] = useState(0);

  function openRequestDialog(defaultCategory: PtoCategory | null) {
    setRequestDefaultCategory(defaultCategory);
    setRequestOpen(true);
    setRequestNonce((n) => n + 1);
  }

  const balanceByPerson = useMemo(() => {
    const map = new Map<string, Map<PtoCategory, number>>();
    for (const b of balances) {
      if (!map.has(b.user_id)) map.set(b.user_id, new Map());
      map.get(b.user_id)!.set(b.category, b.current_balance);
    }
    return map;
  }, [balances]);

  const myBalances = balanceByPerson.get(me.id) ?? new Map();
  const partnerBalances = partner ? balanceByPerson.get(partner.id) ?? new Map() : null;

  const pendingForMe = conversions.filter(
    (c) => c.status === "pending_partner_approval" && c.requested_by !== me.id,
  );
  const myPendingConversions = conversions.filter(
    (c) => c.status === "pending_partner_approval" && c.requested_by === me.id,
  );

  const calendarEntries = useMemo<HeatmapEntry[]>(() => {
    if (!partner) return [];
    return transactions
      .filter((t) => t.status === "completed" && t.transaction_type === "request")
      .map((t) => {
        const start = new Date(t.occurred_at);
        const end = new Date(start.getTime() + t.base_hours * 60 * 60 * 1000);
        return { start, end, person: t.user_id === me.id ? ("a" as const) : ("b" as const) };
      });
  }, [transactions, me.id, partner]);

  const statsRows = useMemo<StatRow[]>(() => {
    if (!partner) return [];
    const hoursOffFor = (userId: string) =>
      transactions
        .filter(
          (t) =>
            t.user_id === userId && t.status === "completed" && t.transaction_type === "request",
        )
        .reduce((sum, t) => sum + t.base_hours, 0);

    const balanceFor = (userId: string) =>
      balances.filter((b) => b.user_id === userId).reduce((sum, b) => sum + b.current_balance, 0);

    const conversionCount = (userId: string, status: PtoConversion["status"]) =>
      conversions.filter((c) => c.requested_by === userId && c.status === status).length;

    return [
      {
        label: "TIME OFF DUTY (COMPLETED)",
        a: `${hoursOffFor(me.id).toFixed(1)}H`,
        b: `${hoursOffFor(partner.id).toFixed(1)}H`,
      },
      {
        label: "CURRENT BANK BALANCE",
        a: `${balanceFor(me.id).toFixed(1)}H`,
        b: `${balanceFor(partner.id).toFixed(1)}H`,
      },
      {
        label: "CONVERSIONS APPROVED",
        a: String(conversionCount(me.id, "approved")),
        b: String(conversionCount(partner.id, "approved")),
      },
      {
        label: "CONVERSIONS DENIED",
        a: String(conversionCount(me.id, "denied")),
        b: String(conversionCount(partner.id, "denied")),
      },
      {
        label: "AWAITING PARTNER APPROVAL",
        a: String(conversionCount(me.id, "pending_partner_approval")),
        b: String(conversionCount(partner.id, "pending_partner_approval")),
      },
    ];
  }, [transactions, balances, conversions, me.id, partner]);

  const statsFooter = useMemo(() => {
    if (!partner) return undefined;
    const balanceFor = (userId: string) =>
      balances.filter((b) => b.user_id === userId).reduce((sum, b) => sum + b.current_balance, 0);
    const diff = balanceFor(partner.id) - balanceFor(me.id);
    return `Δ ${Math.abs(diff).toFixed(1)}H ${diff >= 0 ? `favoring ${partner.display_name ?? "partner"}` : "favoring you"}`;
  }, [balances, me.id, partner]);

  async function submitRequest(input: {
    category: PtoCategory;
    hours: number;
    occurredAt: string;
    note: string;
  }) {
    const { error } = await supabase.rpc("create_pto_request", {
      p_category: input.category,
      p_base_hours: input.hours,
      p_occurred_at: input.occurredAt,
      p_note: input.note || null,
    });
    if (error) {
      toast.error(friendlyRpcError(error.message));
      return false;
    }
    toast.success("Logged.");
    router.refresh();
    return true;
  }

  async function submitConversion(input: {
    from: PtoCategory;
    to: PtoCategory;
    hours: number;
  }) {
    const { error } = await supabase.from("pto_conversions").insert({
      household_id: household.id,
      requested_by: me.id,
      from_category: input.from,
      to_category: input.to,
      hours: input.hours,
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success(
      partner
        ? `Sent to ${partner.display_name ?? "your partner"} for approval.`
        : "Conversion requested.",
    );
    router.refresh();
    return true;
  }

  async function respondToConversion(id: string, approve: boolean) {
    const { error } = await supabase.rpc(
      approve ? "approve_conversion" : "deny_conversion",
      { p_conversion_id: id },
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
              approve conversions.
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
        <Button onClick={() => openRequestDialog(null)}>Request time off</Button>
        <a href="#activity" className={buttonVariants({ variant: "outline" })}>
          View activity
        </a>
        <Button
          variant="outline"
          onClick={() => {
            setConversionOpen(true);
            setConversionNonce((n) => n + 1);
          }}
          disabled={!partner}
        >
          Propose a conversion
        </Button>
      </div>

      {pendingForMe.length > 0 && (
        <ApprovalInbox
          conversions={pendingForMe}
          chudMode={chudMode}
          onRespond={respondToConversion}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {PTO_CATEGORIES.map((category) => (
          <BalanceCard
            key={category}
            category={category}
            chudMode={chudMode}
            myBalance={myBalances.get(category) ?? 0}
            partnerBalance={partnerBalances?.get(category) ?? null}
            partnerName={partner?.display_name}
            onRequest={() => openRequestDialog(category)}
          />
        ))}
      </div>

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
        {myPendingConversions.length > 0 && (
          <p className="text-muted-foreground mb-2 text-xs">
            {myPendingConversions.length} conversion request
            {myPendingConversions.length > 1 ? "s" : ""} awaiting your
            partner&apos;s approval.
          </p>
        )}
        <TransactionsList
          transactions={transactions}
          me={me}
          partner={partner}
          chudMode={chudMode}
        />
      </div>

      {partner && (
        <PtoCalendarHeatmap
          entries={calendarEntries}
          labelA="You"
          labelB={partner.display_name ?? "Partner"}
        />
      )}

      <RequestPtoDialog
        key={`request-${requestNonce}`}
        defaultCategory={requestDefaultCategory}
        household={household}
        open={requestOpen}
        onOpenChange={setRequestOpen}
        onSubmit={submitRequest}
        chudMode={chudMode}
      />

      <ConversionDialog
        key={`conversion-${conversionNonce}`}
        open={conversionOpen}
        onOpenChange={setConversionOpen}
        onSubmit={submitConversion}
        chudMode={chudMode}
      />
    </div>
  );
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  OVERDRAFT_FLOOR_EXCEEDED:
    "That would exceed the household's overdraft floor.",
  SELF_APPROVAL_BLOCKED: "You can't approve or deny your own request.",
  ALREADY_RESOLVED: "That request was already handled.",
  NO_BALANCE_ROW: "No balance found for that category.",
  INVALID_HOURS: "Enter a positive number of hours.",
};

function friendlyRpcError(message: string): string {
  const code = message.split(":")[0]?.trim();
  return RPC_ERROR_MESSAGES[code] ?? message;
}
