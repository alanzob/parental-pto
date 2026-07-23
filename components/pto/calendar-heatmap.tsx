"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OffCategory } from "@/lib/pto/categories";

export type PersonKey = "a" | "b";

export type HeatmapEntry = {
  date: Date;
  category: OffCategory;
  person: PersonKey;
};

// morning → top band, afternoon → middle, evening → bottom; a day off fills
// all three.
const CATEGORY_BANDS: Record<OffCategory, number[]> = {
  morning: [0],
  afternoon: [1],
  evening: [2],
  day: [0, 1, 2],
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function monthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

function bandBackground(colorA: string, colorB: string, a: boolean, b: boolean): string {
  if (a && b) return `linear-gradient(to right, ${colorA} 50%, ${colorB} 50%)`;
  if (a) return colorA;
  if (b) return colorB;
  return "transparent";
}

export function PtoCalendarHeatmap({
  title = "Me-Time Schedule — 3 Months Back, 9 Forward",
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
      const d = new Date(start.getFullYear(), start.getMonth() + i - 3, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  // Index entries by day-key → per-person set of filled bands.
  const byDay = useMemo(() => {
    const map = new Map<string, { a: Set<number>; b: Set<number> }>();
    for (const e of entries) {
      const key = `${e.date.getFullYear()}-${e.date.getMonth()}-${e.date.getDate()}`;
      const rec = map.get(key) ?? { a: new Set<number>(), b: new Set<number>() };
      for (const band of CATEGORY_BANDS[e.category]) rec[e.person].add(band);
      map.set(key, rec);
    }
    return map;
  }, [entries]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="label-tag">{title}</CardTitle>
        <div className="text-muted-foreground flex flex-wrap gap-4 pt-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3" style={{ background: colorA }} />
            {labelA}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3" style={{ background: colorB }} />
            {labelB}
          </span>
          <span>Top→bottom = morning · afternoon · evening; full = day off</span>
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
                  const rec = byDay.get(`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`);
                  return (
                    <div
                      key={i}
                      title={day.toLocaleDateString()}
                      className="border-border/60 relative flex aspect-square items-center justify-center overflow-hidden border font-mono text-[11px] sm:text-[9px]"
                    >
                      {rec && (
                        <div className="absolute inset-0 flex flex-col" aria-hidden="true">
                          {[0, 1, 2].map((band) => (
                            <div
                              key={band}
                              className="flex-1"
                              style={{
                                background: bandBackground(
                                  colorA,
                                  colorB,
                                  rec.a.has(band),
                                  rec.b.has(band),
                                ),
                                opacity: 0.85,
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <span className="relative">{day.getDate()}</span>
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
