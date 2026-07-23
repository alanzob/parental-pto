import { DEFAULT_WEIGHTS, type OffCategory } from "@/lib/pto/categories";
import { tripWeight, type TripPeriod } from "@/lib/pto/trip";

export type { OffCategory };

export type DemoPerson = "brian" | "vanda";

export const DEMO_PEOPLE: Record<DemoPerson, { name: string }> = {
  brian: { name: "Mike" },
  vanda: { name: "Alison" },
};

export function otherPerson(person: DemoPerson): DemoPerson {
  return person === "brian" ? "vanda" : "brian";
}

// The demo uses the default category weights (no household Settings locally).
export function weightOf(category: OffCategory): number {
  return DEFAULT_WEIGHTS[category];
}

function toDateStr(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Credited points for any request, single-day or trip. */
export function weightOfRequest(r: DemoRequest): number {
  if (r.category === "trip" && r.departurePeriod && r.returnPeriod && r.endDate) {
    return tripWeight(DEFAULT_WEIGHTS, toDateStr(r.date), r.departurePeriod, toDateStr(r.endDate), r.returnPeriod);
  }
  return weightOf(r.category as OffCategory);
}

export type DemoRequest = {
  id: string;
  title: string;
  /** Who took the time off to be themselves. */
  requestedBy: DemoPerson;
  /** The partner who banks the credit once approved. */
  creditedTo: DemoPerson;
  /** ISO datetime on the request's start date (at the category's/departure
   * period's window start). */
  date: string;
  category: OffCategory | "trip";
  status: "pending" | "approved" | "denied" | "cancelled";
  /** Set for instances generated from one recurring series; undefined for one-offs. */
  seriesId?: string;
  createdAt: string; // ISO datetime
  /** Set together, only when category = 'trip'. */
  endDate?: string;
  departurePeriod?: TripPeriod;
  returnPeriod?: TripPeriod;
};
