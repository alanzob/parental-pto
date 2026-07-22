"use client";

import { useMemo } from "react";
import { useDemo } from "@/components/demo/demo-provider";
import { SeriesControls, type SeriesSummary } from "@/components/pto/series-controls";

export function DemoSeriesControls() {
  const { persona, requests, respondSeries, cancelSeries, rescheduleSeries } = useDemo();

  const series = useMemo<SeriesSummary[]>(() => {
    const now = new Date().getTime();
    const groups = new Map<string, typeof requests>();
    for (const r of requests) {
      if (!r.seriesId) continue;
      const arr = groups.get(r.seriesId);
      if (arr) arr.push(r);
      else groups.set(r.seriesId, [r]);
    }
    return Array.from(groups.entries()).map(([seriesId, items]) => {
      const first = items[0];
      const pending = items.filter((i) => i.status === "pending").length;
      const futureRemaining = items.filter(
        (i) =>
          (i.status === "pending" || i.status === "approved") &&
          new Date(i.offDutyStart).getTime() > now,
      ).length;
      return {
        seriesId,
        title: first.title,
        total: items.length,
        pending,
        futureRemaining,
        canRespond: first.creditedTo === persona && pending > 0,
        canManage: first.requestedBy === persona,
      };
    });
  }, [requests, persona]);

  return (
    <SeriesControls
      series={series}
      onRespond={respondSeries}
      onCancel={cancelSeries}
      onShift={rescheduleSeries}
    />
  );
}
