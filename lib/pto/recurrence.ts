// Shared recurrence helpers for the "Repeat" option. Used by the request
// dialog for the live occurrence-count preview, and by the demo to actually
// generate a linked series client-side. The real app generates instances
// server-side in create_recurring_pto_request (migration 0007); this mirrors
// that stepping so the preview count matches what gets created.

export type Frequency = "none" | "daily" | "weekly" | "monthly";

export const MAX_OCCURRENCES = 52;

function step(from: Date, frequency: Frequency, n: number): Date {
  const d = new Date(from);
  if (frequency === "daily") d.setDate(d.getDate() + n);
  else if (frequency === "weekly") d.setDate(d.getDate() + n * 7);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + n);
  return d;
}

/** The list of off-duty start Dates for a recurring series: the first
 * occurrence plus each subsequent one on cadence, up to and including the
 * `endsBy` day, capped at MAX_OCCURRENCES. */
export function occurrenceStarts(
  firstStart: Date,
  endsBy: Date,
  frequency: Frequency,
): Date[] {
  if (frequency === "none") return [firstStart];
  // Include the whole `endsBy` calendar day.
  const cutoff = new Date(endsBy);
  cutoff.setHours(23, 59, 59, 999);

  const starts: Date[] = [];
  for (let n = 0; n < MAX_OCCURRENCES; n++) {
    const s = step(firstStart, frequency, n);
    if (s.getTime() > cutoff.getTime()) break;
    starts.push(s);
  }
  return starts;
}

export function frequencyLabel(f: Frequency): string {
  return { none: "Does not repeat", daily: "Daily", weekly: "Weekly", monthly: "Monthly" }[f];
}
