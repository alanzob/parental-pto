"use client";

import { useMemo } from "react";
import { useDemo } from "@/components/demo/demo-provider";
import { DEMO_PEOPLE, weightOf } from "@/lib/demo/types";
import { computeDisparitySeries, type DisparityEvent } from "@/lib/pto/disparity";
import { BalanceDisparityChart } from "@/components/pto/balance-disparity-chart";

export function DisparityChart() {
  const { requests } = useDemo();

  const points = useMemo(() => {
    const events: DisparityEvent[] = requests
      .filter((r) => r.status === "approved")
      .map((r) => ({
        date: new Date(r.date),
        hours: weightOf(r.category),
        favorsB: r.creditedTo === "vanda",
      }));
    return computeDisparitySeries(events);
  }, [requests]);

  return (
    <BalanceDisparityChart points={points} labelA={DEMO_PEOPLE.brian.name} labelB={DEMO_PEOPLE.vanda.name} />
  );
}
