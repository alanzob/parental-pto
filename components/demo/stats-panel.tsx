"use client";

import { useMemo } from "react";
import { useDemo } from "@/components/demo/demo-provider";
import { DEMO_PEOPLE, weightOfRequest, type DemoPerson } from "@/lib/demo/types";
import { formatPoints } from "@/lib/pto/categories";
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

    const pointsOff = Object.fromEntries(
      people.map((p) => [
        p,
        requests
          .filter((r) => r.requestedBy === p && r.status === "approved")
          .reduce((sum, r) => sum + weightOfRequest(r), 0),
      ]),
    ) as Record<DemoPerson, number>;

    return [
      {
        label: "ME TIME TAKEN (APPROVED)",
        a: formatPoints(pointsOff.brian),
        b: formatPoints(pointsOff.vanda),
      },
      {
        label: "CURRENT BANK BALANCE",
        a: formatPoints(balanceFor("brian")),
        b: formatPoints(balanceFor("vanda")),
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
    const diff = balanceFor("vanda") - balanceFor("brian");
    return `Δ ${formatPoints(Math.abs(diff))} ${diff >= 0 ? "favoring Vanda" : "favoring Brian"}`;
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
