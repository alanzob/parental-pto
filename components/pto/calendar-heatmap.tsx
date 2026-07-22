"use client";

import { useMemo } from "react";
import { dayOverlap } from "@/lib/date-overlap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type PersonKey = "a" | "b";

export type HeatmapEntry = {
  start: Date;
  end: Date;
  person: PersonKey;
};

type Overlap = "none" | "half" | "full";

function cellBackground(colorA: string, colorB: string, a: Overlap, b: Overlap): string {
  if (a === "full" && b === "full") {
    return `conic-gradient(${colorA} 0 50%, ${colorB} 50% 100%)`;
  }
  if (a !== "none" && b !== "none") {
    const top = a === "full" ? colorA : `color-mix(in oklab, ${colorA} 45%, transparent)`;
    const bottom = b === "full" ? colorB : `color-mix(in oklab, ${colorB} 45%, transparent)`;
    return `linear-gradient(to bottom, ${top} 50%, ${bottom} 50%)`;
  }
  if (a === "full") return colorA;
  if (a === "half") return `linear-gradient(to right, ${colorA} 50%, transparent 50%)`;
  if (b === "full") return colorB;
  if (b === "half") return `linear-gradient(to right, ${colorB} 50%, transparent 50%)`;
  return "transparent";
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function monthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Sunday-first weekday index (0 = Sun .. 6 = Sat) — matches Date#getDay() directly.
  const startOffset = firstDay.getDay();
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

export function PtoCalendarHeatmap({
  title = "12-Month No-Parenting Schedule",
  entries,
  labelA,
  labelB,
  colorA = "#1a6b3c",
  colorB = "#6a3fa0",
}: {
  title?: string;
  entries: HeatmapEntry[];
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
}) {
  const months = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  function overlapFor(day: Date, person: PersonKey): Overlap {
    let result: Overlap = "none";
    for (const e of entries) {
      if (e.person !== person) continue;
      const o = dayOverlap(day, e.start, e.end);
      if (o === "full") return "full";
      if (o === "half") result = "half";
    }
    return result;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="label-tag">{title}</CardTitle>
        <div className="text-muted-foreground flex gap-4 pt-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3" style={{ background: colorA }} />
            {labelA}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3" style={{ background: colorB }} />
            {labelB}
          </span>
          <span>Half-tone = half day</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {months.map(({ year, month }) => (
            <div key={`${year}-${month}`} className="border-border border p-2">
              <p className="label-tag mb-1.5">
                {new Date(year, month, 1).toLocaleString(undefined, { month: "short" })} {year}
              </p>
              <div className="text-muted-foreground mb-0.5 grid grid-cols-7 gap-px text-center font-mono text-[11px] sm:text-[9px]">
                {WEEKDAY_LABELS.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px">
                {monthGrid(year, month).map((day, i) => {
                  if (!day) return <div key={i} className="aspect-square" />;
                  const a = overlapFor(day, "a");
                  const b = overlapFor(day, "b");
                  return (
                    <div
                      key={i}
                      title={day.toLocaleDateString()}
                      className="border-border/60 flex aspect-square items-center justify-center border font-mono text-[11px] sm:text-[9px]"
                      style={{ background: cellBackground(colorA, colorB, a, b) }}
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
