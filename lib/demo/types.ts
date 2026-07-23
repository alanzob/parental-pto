import { DEFAULT_WEIGHTS, type OffCategory } from "@/lib/pto/categories";

export type { OffCategory };

export type DemoPerson = "brian" | "vanda";

export const DEMO_PEOPLE: Record<DemoPerson, { name: string }> = {
  brian: { name: "Brian Bear" },
  vanda: { name: "Vanda Bear" },
};

export function otherPerson(person: DemoPerson): DemoPerson {
  return person === "brian" ? "vanda" : "brian";
}

// The demo uses the default category weights (no household Settings locally).
export function weightOf(category: OffCategory): number {
  return DEFAULT_WEIGHTS[category];
}

export type DemoRequest = {
  id: string;
  title: string;
  /** Who took the time off to be themselves. */
  requestedBy: DemoPerson;
  /** The partner who banks the credit once approved. */
  creditedTo: DemoPerson;
  /** ISO datetime on the request's date (at the category's window start). */
  date: string;
  category: OffCategory;
  status: "pending" | "approved" | "denied" | "cancelled";
  /** Set for instances generated from one recurring series; undefined for one-offs. */
  seriesId?: string;
  createdAt: string; // ISO datetime
};
