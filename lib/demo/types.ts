export type DemoPerson = "brian" | "vanda";

export const DEMO_PEOPLE: Record<DemoPerson, { name: string }> = {
  brian: { name: "Brian Bear" },
  vanda: { name: "Vanda Bear" },
};

export function otherPerson(person: DemoPerson): DemoPerson {
  return person === "brian" ? "vanda" : "brian";
}

export type DemoRequest = {
  id: string;
  title: string;
  /** Who took the time away from parenting. */
  requestedBy: DemoPerson;
  /** The partner who banks the equivalent credit once approved. */
  creditedTo: DemoPerson;
  offDutyStart: string; // ISO datetime — when this person goes off duty
  backOnDuty: string; // ISO datetime — when they resume parenting
  fullDays: number;
  hours: number;
  status: "pending" | "approved" | "denied";
  createdAt: string; // ISO datetime
};

/** Car-rental-style duration: elapsed time from off-duty to back-on-duty,
 * split into whole 24h days plus a remainder in hours. */
export function computeDuration(
  offDutyStart: string,
  backOnDuty: string,
): { fullDays: number; hours: number } {
  const start = new Date(offDutyStart);
  const end = new Date(backOnDuty);
  const totalHours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
  return { fullDays: Math.floor(totalHours / 24), hours: Math.round(totalHours % 24) };
}

export function formatDuration(fullDays: number, hours: number): string {
  const parts: string[] = [];
  if (fullDays > 0) parts.push(`${fullDays} Full Day${fullDays === 1 ? "" : "s"}`);
  if (hours > 0 || parts.length === 0) parts.push(`${hours} Hour${hours === 1 ? "" : "s"}`);
  return `${parts.join(", ")} No Parenting`;
}

/** Normalizes an hours total (which may exceed 24 once summed across
 * multiple requests) back into a clean days + hours pair. */
export function normalizeDuration(totalHours: number): { fullDays: number; hours: number } {
  return { fullDays: Math.floor(totalHours / 24), hours: totalHours % 24 };
}

export function durationToHours(fullDays: number, hours: number): number {
  return fullDays * 24 + hours;
}
