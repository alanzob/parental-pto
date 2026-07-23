"use client";

import { useMemo } from "react";
import { useDemo } from "@/components/demo/demo-provider";
import { DEMO_PEOPLE } from "@/lib/demo/types";
import { PtoCalendarHeatmap, type HeatmapEntry } from "@/components/pto/calendar-heatmap";

export function CalendarHeatmap() {
  const { requests } = useDemo();

  const entries = useMemo<HeatmapEntry[]>(
    () =>
      requests
        .filter((r) => r.status === "approved")
        .map((r) => ({
          date: new Date(r.date),
          category: r.category,
          person: r.requestedBy === "brian" ? "a" : "b",
        })),
    [requests],
  );

  return (
    <PtoCalendarHeatmap
      entries={entries}
      labelA={DEMO_PEOPLE.brian.name}
      labelB={DEMO_PEOPLE.vanda.name}
    />
  );
}
