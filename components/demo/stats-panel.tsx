"use client";

import { useMemo } from "react";
import { useDemo } from "@/components/demo/demo-provider";
import { DEMO_PEOPLE, durationToHours, type DemoPerson } from "@/lib/demo/types";
import { ComparativeStats, type StatRow } from "@/components/pto/comparative-stats";

export function StatsPanel() {
  const { requests, balanceFor } = useDemo();

  const rows: StatRow[] = useMemo(() => {
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
        a: `${totalHoursOff.brian}H`,
        b: `${totalHoursOff.vanda}H`,
      },
      {
        label: "CURRENT BANK BALANCE",
        a: `${balances.brian}H`,
        b: `${balances.vanda}H`,
      },
      {
        label: "REQUESTS APPROVED",
        a: String(requestedTotal.brian),
        b: String(requestedTotal.vanda),
      },
      {
        label: "REQUESTS DENIED",
        a: String(deniedTotal.brian),
        b: String(deniedTotal.vanda),
      },
      {
        label: "AWAITING THEIR APPROVAL",
        a: String(pendingByCreditedTo.brian),
        b: String(pendingByCreditedTo.vanda),
      },
    ];
  }, [requests, balanceFor]);

  const footer = useMemo(() => {
    const b = balanceFor("brian");
    const v = balanceFor("vanda");
    const diff = durationToHours(v.fullDays, v.hours) - durationToHours(b.fullDays, b.hours);
    return `Δ ${Math.abs(diff)}H ${diff >= 0 ? "favoring Vanda" : "favoring Brian"}`;
  }, [balanceFor]);

  return (
    <ComparativeStats
      labelA={DEMO_PEOPLE.brian.name}
      labelB={DEMO_PEOPLE.vanda.name}
      rows={rows}
      footer={footer}
    />
  );
}
