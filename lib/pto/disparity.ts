// Shared helper for the balance-disparity chart: turns a chronological list
// of credited/banked events into a cumulative "who's ahead, by how much"
// time series. Positive = favors person B, negative = favors person A —
// matches the "Δ ___H favoring ___" language already used elsewhere.

export type DisparityEvent = {
  date: Date;
  hours: number;
  /** true if this credit favors B (moves the disparity up), false if it favors A. */
  favorsB: boolean;
};

export type DisparityPoint = { date: Date; disparity: number };

export function computeDisparitySeries(events: DisparityEvent[]): DisparityPoint[] {
  const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (sorted.length === 0) return [];

  let cumulative = 0;
  const points: DisparityPoint[] = [{ date: sorted[0].date, disparity: 0 }];
  for (const e of sorted) {
    cumulative += e.favorsB ? e.hours : -e.hours;
    points.push({ date: e.date, disparity: cumulative });
  }
  return points;
}
