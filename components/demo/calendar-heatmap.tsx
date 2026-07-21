"use client";

import { useMemo } from "react";
import { useDemo } from "@/components/demo/demo-provider";
import { dayOverlap, DEMO_PEOPLE, type DemoPerson } from "@/lib/demo/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Overlap = "none" | "half" | "full";

const BRIAN_COLOR = "#1a6b3c"; // green
const VANDA_COLOR = "#6a3fa0"; // purple

function cellBackground(brian: Overlap, vanda: Overlap): string {
  if (brian === "full" && vanda === "full") {
    return `conic-gradient(${BRIAN_COLOR} 0 50%, ${VANDA_COLOR} 50% 100%)`;
  }
  if (brian !== "none" && vanda !== "none") {
    // both partial or one full one half — stack top/bottom
    const top = brian === "full" ? BRIAN_COLOR : `color-mix(in oklab, ${BRIAN_COLOR} 45%, transparent)`;
    const bottom = vanda === "full" ? VANDA_COLOR : `color-mix(in oklab, ${VANDA_COLOR} 45%, transparent)`;
    return `linear-gradient(to bottom, ${top} 50%, ${bottom} 50%)`;
  }
  if (brian === "full") return BRIAN_COLOR;
  if (brian === "half") return `linear-gradient(to right, ${BRIAN_COLOR} 50%, transparent 50%)`;
  if (vanda === "full") return VANDA_COLOR;
  if (vanda === "half") return `linear-gradient(to right, ${VANDA_COLOR} 50%, transparent 50%)`;
  return "transparent";
}

function monthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first weekday index (0 = Mon .. 6 = Sun)
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

export function CalendarHeatmap() {
  const { requests } = useDemo();
  const approved = useMemo(() => requests.filter((r) => r.status === "approved"), [requests]);

  const months = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  function overlapFor(day: Date, person: DemoPerson): Overlap {
    let result: Overlap = "none";
    for (const r of approved) {
      if (r.requestedBy !== person) continue;
      const o = dayOverlap(day, r.offDutyStart, r.backOnDuty);
      if (o === "full") return "full";
      if (o === "half") result = "half";
    }
    return result;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="label-tag">12-Month No-Parenting Schedule</CardTitle>
        <div className="text-muted-foreground flex gap-4 pt-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3" style={{ background: BRIAN_COLOR }} />
            {DEMO_PEOPLE.brian.name}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3" style={{ background: VANDA_COLOR }} />
            {DEMO_PEOPLE.vanda.name}
          </span>
          <span>Half-tone = half day</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {months.map(({ year, month }) => (
            <div key={`${year}-${month}`} className="border-border border p-2">
              <p className="label-tag mb-1.5">
                {new Date(year, month, 1).toLocaleString(undefined, { month: "short" })} {year}
              </p>
              <div className="grid grid-cols-7 gap-px">
                {monthGrid(year, month).map((day, i) => {
                  if (!day) return <div key={i} className="aspect-square" />;
                  const brian = overlapFor(day, "brian");
                  const vanda = overlapFor(day, "vanda");
                  return (
                    <div
                      key={i}
                      title={day.toLocaleDateString()}
                      className="border-border/60 flex aspect-square items-center justify-center border font-mono text-[9px]"
                      style={{ background: cellBackground(brian, vanda) }}
                    >
                      {day.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
