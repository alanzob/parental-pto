"use client";

import { useMemo } from "react";
import { useDemo } from "@/components/demo/demo-provider";
import { DEMO_PEOPLE } from "@/lib/demo/types";
import { tripCalendarEntries } from "@/lib/pto/trip";
import type { OffCategory } from "@/lib/pto/categories";
import { PtoCalendarHeatmap, type HeatmapEntry } from "@/components/pto/calendar-heatmap";

function toDateStr(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function CalendarHeatmap() {
  const { requests } = useDemo();

  const entries = useMemo<HeatmapEntry[]>(() => {
    const result: HeatmapEntry[] = [];
    for (const r of requests) {
      if (r.status !== "approved") continue;
      const person = r.requestedBy === "brian" ? ("a" as const) : ("b" as const);
      if (r.category === "trip" && r.endDate && r.departurePeriod && r.returnPeriod) {
        const trip = tripCalendarEntries(toDateStr(r.date), r.departurePeriod, toDateStr(r.endDate), r.returnPeriod);
        for (const t of trip) {
          const [y, m, d] = t.date.split("-").map(Number);
          result.push({ date: new Date(y, m - 1, d), category: t.category, person });
        }
      } else {
        result.push({ date: new Date(r.date), category: r.category as OffCategory, person });
      }
    }
    return result;
  }, [requests]);

  return (
    <PtoCalendarHeatmap
      entries={entries}
      labelA={DEMO_PEOPLE.brian.name}
      labelB={DEMO_PEOPLE.vanda.name}
    />
  );
}
