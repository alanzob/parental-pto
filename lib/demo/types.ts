export { computeDuration, durationToHours, formatDuration, normalizeDuration } from "@/lib/duration";

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
  /** Who took the time off to be themselves. */
  requestedBy: DemoPerson;
  /** The partner who banks the equivalent credit once approved. */
  creditedTo: DemoPerson;
  offDutyStart: string; // ISO datetime — when this person clocks out
  backOnDuty: string; // ISO datetime — when they're back on duty
  fullDays: number;
  hours: number;
  status: "pending" | "approved" | "denied" | "cancelled";
  /** Set for instances generated from one recurring series; undefined for one-offs. */
  seriesId?: string;
  createdAt: string; // ISO datetime
};
