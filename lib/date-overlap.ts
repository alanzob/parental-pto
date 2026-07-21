/** Whether, and how much of, a given calendar day (local, starting at
 * `dayStart`) overlaps a [start, end) window — used by the calendar
 * heatmap on both the demo and the real dashboard. */
export function dayOverlap(dayStart: Date, start: Date, end: Date): "none" | "half" | "full" {
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const overlapStart = Math.max(dayStart.getTime(), start.getTime());
  const overlapEnd = Math.min(dayEnd.getTime(), end.getTime());
  const overlapHours = Math.max(0, overlapEnd - overlapStart) / (1000 * 60 * 60);
  if (overlapHours <= 0) return "none";
  if (overlapHours >= 24) return "full";
  return "half";
}
