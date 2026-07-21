"use client";

import { useMemo } from "react";
import { useDemo } from "@/components/demo/demo-provider";
import { durationToHours, type DemoPerson } from "@/lib/demo/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = { label: string; brian: string; vanda: string };

export function StatsPanel() {
  const { requests, balanceFor } = useDemo();

  const rows: Row[] = useMemo(() => {
    const people: DemoPerson[] = ["brian", "vanda"];

    const countBy = (status: string, field: "requestedBy" | "creditedTo") =>
      Object.fromEntries(
        people.map((p) => [
          p,
          requests.filter((r) => r[field] === p && r.status === status).length,
        ]),
      ) as Record<DemoPerson, number>;

    const requestedTotal = countBy("approved", "requestedBy");
    const pendingByCreditedTo = countBy("pending", "creditedTo");
    const deniedTotal = countBy("denied", "requestedBy");

    const totalHoursOff = Object.fromEntries(
      people.map((p) => [
        p,
        requests
          .filter((r) => r.requestedBy === p && r.status === "approved")
          .reduce((sum, r) => sum + durationToHours(r.fullDays, r.hours), 0),
      ]),
    ) as Record<DemoPerson, number>;

    const balances = Object.fromEntries(
      people.map((p) => {
        const b = balanceFor(p);
        return [p, durationToHours(b.fullDays, b.hours)];
      }),
    ) as Record<DemoPerson, number>;

    return [
      {
        label: "TIME OFF DUTY (APPROVED)",
        brian: `${totalHoursOff.brian}H`,
        vanda: `${totalHoursOff.vanda}H`,
      },
      {
        label: "CURRENT BANK BALANCE",
        brian: `${balances.brian}H`,
        vanda: `${balances.vanda}H`,
      },
      {
        label: "REQUESTS APPROVED",
        brian: String(requestedTotal.brian),
        vanda: String(requestedTotal.vanda),
      },
      {
        label: "REQUESTS DENIED",
        brian: String(deniedTotal.brian),
        vanda: String(deniedTotal.vanda),
      },
      {
        label: "AWAITING THEIR APPROVAL",
        brian: String(pendingByCreditedTo.brian),
        vanda: String(pendingByCreditedTo.vanda),
      },
    ];
  }, [requests, balanceFor]);

  const balanceDiff = useMemo(() => {
    const b = balanceFor("brian");
    const v = balanceFor("vanda");
    return durationToHours(v.fullDays, v.hours) - durationToHours(b.fullDays, b.hours);
  }, [balanceFor]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="label-tag">Comparative Ledger — Brian vs. Vanda</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full border-collapse font-mono text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="label-tag text-muted-foreground px-4 py-2 text-left font-normal">
                Metric
              </th>
              <th className="label-tag px-4 py-2 text-right font-normal">Brian Bear</th>
              <th className="label-tag px-4 py-2 text-right font-normal">Vanda Bear</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-border/60 border-b">
                <td className="text-muted-foreground px-4 py-2">{r.label}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.brian}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.vanda}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-muted-foreground border-border border-t px-4 py-2 text-xs">
          Δ {Math.abs(balanceDiff)}H {balanceDiff >= 0 ? "favoring Vanda" : "favoring Brian"}
        </p>
      </CardContent>
    </Card>
  );
}
