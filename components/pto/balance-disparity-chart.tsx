"use client";

import { useId, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DisparityPoint } from "@/lib/pto/disparity";

const WIDTH = 600;
const HEIGHT = 220;
const PAD_LEFT = 40;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

function fmtHours(h: number): string {
  const rounded = Math.round(h * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded} pts`;
}

function fmtAbsHours(h: number): string {
  return `${Math.round(Math.abs(h) * 10) / 10} pts`;
}

function fmtAxisDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function BalanceDisparityChart({
  points,
  labelA,
  labelB,
  colorA = "#1a6b3c",
  colorB = "#6a3fa0",
  title = "Balance Disparity Over Time",
}: {
  points: DisparityPoint[];
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
  title?: string;
}) {
  const gradientId = useId();

  const geometry = useMemo(() => {
    if (points.length < 2) return null;

    const values = points.map((p) => p.disparity);
    const domainMax = Math.max(4, ...values.map((v) => Math.abs(v))) * 1.1;

    const t0 = points[0].date.getTime();
    const t1 = points[points.length - 1].date.getTime();
    const span = Math.max(1, t1 - t0);

    const x = (t: number) => PAD_LEFT + ((t - t0) / span) * (WIDTH - PAD_LEFT - PAD_RIGHT);
    const y = (v: number) =>
      PAD_TOP + (1 - (v + domainMax) / (2 * domainMax)) * (HEIGHT - PAD_TOP - PAD_BOTTOM);

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.date.getTime()).toFixed(1)} ${y(p.disparity).toFixed(1)}`)
      .join(" ");

    const zeroY = y(0);
    const areaPath = [
      `M ${x(points[0].date.getTime()).toFixed(1)} ${zeroY.toFixed(1)}`,
      ...points.map((p) => `L ${x(p.date.getTime()).toFixed(1)} ${y(p.disparity).toFixed(1)}`),
      `L ${x(points[points.length - 1].date.getTime()).toFixed(1)} ${zeroY.toFixed(1)}`,
      "Z",
    ].join(" ");

    const last = points[points.length - 1];
    const lastX = x(last.date.getTime());
    const lastY = y(last.disparity);
    const lastColor = last.disparity >= 0 ? colorB : colorA;

    return { domainMax, x, y, linePath, areaPath, zeroY, last, lastX, lastY, lastColor, t0, t1 };
  }, [points, colorA, colorB]);

  if (!geometry) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="label-tag">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Not enough history yet.</p>
        </CardContent>
      </Card>
    );
  }

  const { domainMax, y, linePath, areaPath, zeroY, last, lastX, lastY, lastColor, t0, t1 } = geometry;
  const summary = `From ${points[0].date.toLocaleDateString()} to ${last.date.toLocaleDateString()}, the balance disparity moved from even to ${fmtHours(last.disparity)} ${last.disparity >= 0 ? `favoring ${labelB}` : `favoring ${labelA}`}, peaking around ${Math.round(domainMax / 1.1)} points at its widest.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="label-tag">{title}</CardTitle>
        <CardDescription>
          The gap between your balances, over time — not zero, just never left to drift too far
          before it swings back. Reactive, not perfectly equal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground mb-2 flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5" style={{ background: colorA }} />
            Favors {labelA}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5" style={{ background: colorB }} />
            Favors {labelB}
          </span>
        </div>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={summary}
        >
          <title>{title}</title>
          <desc>{summary}</desc>

          <defs>
            {/* userSpaceOnUse + absolute chart coords, so the split lands
             * exactly on the zero line regardless of the filled area's own
             * bounding box — the default objectBoundingBox units split at
             * 50% of the *shape's* extent, which is wrong whenever the data
             * never crosses zero (the whole fill is one color, but the
             * default would still paint a spurious band partway through). */}
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="0"
              y2={HEIGHT}
            >
              <stop offset={0} stopColor={colorB} stopOpacity="0.28" />
              <stop offset={zeroY / HEIGHT} stopColor={colorB} stopOpacity="0.28" />
              <stop offset={zeroY / HEIGHT} stopColor={colorA} stopOpacity="0.28" />
              <stop offset={1} stopColor={colorA} stopOpacity="0.28" />
            </linearGradient>
          </defs>

          {[domainMax, domainMax / 2, -domainMax / 2, -domainMax].map((v) => (
            <line
              key={v}
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--grid-line)"
              strokeWidth={1}
            />
          ))}
          {[domainMax, domainMax / 2, -domainMax / 2, -domainMax].map((v) => (
            <text
              key={`label-${v}`}
              x={PAD_LEFT - 6}
              y={y(v) + 3}
              textAnchor="end"
              fontSize="9"
              fontFamily="monospace"
              className="fill-muted-foreground"
            >
              {Math.round(v)}
            </text>
          ))}

          <line
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={zeroY}
            y2={zeroY}
            stroke="currentColor"
            className="text-border"
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke="var(--foreground)" strokeWidth={2} strokeLinejoin="round" />

          <circle cx={lastX} cy={lastY} r={4} fill={lastColor} stroke="var(--card)" strokeWidth={2} />

          <text x={PAD_LEFT} y={HEIGHT - 8} fontSize="9" fontFamily="monospace" className="fill-muted-foreground">
            {fmtAxisDate(new Date(t0))}
          </text>
          <text
            x={WIDTH - PAD_RIGHT}
            y={HEIGHT - 8}
            textAnchor="end"
            fontSize="9"
            fontFamily="monospace"
            className="fill-muted-foreground"
          >
            {fmtAxisDate(new Date(t1))}
          </text>
        </svg>
        <p className="text-muted-foreground mt-1 text-xs">
          Currently {fmtAbsHours(last.disparity)}{" "}
          {last.disparity >= 0 ? `favoring ${labelB}` : `favoring ${labelA}`}
        </p>
      </CardContent>
    </Card>
  );
}
