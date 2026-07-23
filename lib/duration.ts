/** Shared "car rental" duration model used by both the demo and the real
 * app: elapsed time between two points, expressed as whole days + a
 * remainder in hours. Real balances can carry fractional hours (e.g. 4.5),
 * so `hours` here is not rounded to an integer — only whole-hour car-rental
 * durations (computeDuration) round, aggregated totals (normalizeDuration)
 * don't. */

export type DurationParts = { fullDays: number; hours: number };

/** Elapsed time from `start` to `end`, split into whole 24h days plus a
 * remainder in whole hours — the "off duty starting" → "back on duty"
 * entry pattern. */
export function computeDuration(start: Date | string, end: Date | string): DurationParts {
  const s = new Date(start);
  const e = new Date(end);
  const totalHours = Math.max(0, (e.getTime() - s.getTime()) / (1000 * 60 * 60));
  return { fullDays: Math.floor(totalHours / 24), hours: Math.round(totalHours % 24) };
}

/** Normalizes an hours total (which may exceed 24, or carry a fraction,
 * once aggregated across multiple entries) into a clean days + hours pair. */
export function normalizeDuration(totalHours: number): DurationParts {
  const fullDays = Math.floor(totalHours / 24);
  const hours = totalHours - fullDays * 24;
  return { fullDays, hours };
}

export function durationToHours(fullDays: number, hours: number): number {
  return fullDays * 24 + hours;
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

/** Compact "3d 4.5h" style, for balance figures. */
export function formatCompactDuration(fullDays: number, hours: number): string {
  return `${fullDays}d ${formatHours(hours)}h`;
}

/** Longer "3 Full Days, 4.5 Hours of My Time" style, for previews and
 * request summaries. */
export function formatDuration(fullDays: number, hours: number): string {
  const parts: string[] = [];
  if (fullDays > 0) parts.push(`${fullDays} Full Day${fullDays === 1 ? "" : "s"}`);
  if (hours > 0 || parts.length === 0) parts.push(`${formatHours(hours)} Hour${hours === 1 ? "" : "s"}`);
  return `${parts.join(", ")} of My Time`;
}
