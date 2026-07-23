import { categoryWindow, type OffCategory } from "@/lib/pto/categories";
import type { DemoPerson, DemoRequest } from "./types";

// ~15 months of two people trading off time so each can be themselves for a
// bit (parents most of all). Each entry is a date + category; the credited
// points come from the category weight (day = 3, parts = 1). The cumulative
// "who's owed" disparity swings early (a lopsided stretch, then an over-
// correction) and damps into small, frequent, reciprocal breaks near even.
// Dates are relative to now so the demo never goes stale.
type SeedEntry = { title: string; person: DemoPerson; category: OffCategory; daysAgo: number };

const SEED_ENTRIES: SeedEntry[] = [
  { title: "Work conference — Austin", person: "brian", category: "day", daysAgo: 451 },
  { title: "Dinner with the Reyeses", person: "brian", category: "evening", daysAgo: 436 },
  { title: "College reunion", person: "brian", category: "day", daysAgo: 421 },
  { title: "Weekend at her sister's", person: "vanda", category: "day", daysAgo: 406 },
  { title: "Priya's wedding", person: "vanda", category: "day", daysAgo: 392 },
  { title: "Dinner and a movie", person: "vanda", category: "evening", daysAgo: 372 },
  { title: "Museum, solo", person: "vanda", category: "afternoon", daysAgo: 356 },
  { title: "Solo day to recharge", person: "vanda", category: "day", daysAgo: 341 },
  { title: "Book club", person: "vanda", category: "evening", daysAgo: 322 },
  { title: "Long morning hike", person: "vanda", category: "morning", daysAgo: 305 },
  { title: "Work conference — Denver", person: "brian", category: "day", daysAgo: 288 },
  { title: "Jaime's birthday dinner", person: "brian", category: "evening", daysAgo: 270 },
  { title: "Record shopping", person: "brian", category: "afternoon", daysAgo: 251 },
  { title: "Fishing day trip", person: "brian", category: "day", daysAgo: 230 },
  { title: "Pottery class", person: "vanda", category: "evening", daysAgo: 208 },
  { title: "Spa day with a friend", person: "vanda", category: "day", daysAgo: 183 },
  { title: "Concert at the Fillmore", person: "brian", category: "evening", daysAgo: 157 },
  { title: "Afternoon to read", person: "vanda", category: "afternoon", daysAgo: 126 },
  { title: "Drinks with the team", person: "brian", category: "evening", daysAgo: 96 },
  { title: "Quiet morning to herself", person: "vanda", category: "morning", daysAgo: 64 },
  { title: "Coffee and a walk", person: "brian", category: "afternoon", daysAgo: 33 },
  { title: "Dinner with old friends", person: "vanda", category: "evening", daysAgo: 12 },
];

const PENDING_ENTRIES: { title: string; person: DemoPerson; category: OffCategory; daysFromNow: number }[] = [
  { title: "Evening out with friends", person: "brian", category: "evening", daysFromNow: 4 },
  { title: "Afternoon to herself", person: "vanda", category: "afternoon", daysFromNow: 8 },
];

function otherOf(p: DemoPerson): DemoPerson {
  return p === "brian" ? "vanda" : "brian";
}

function dateStr(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function seedDemoRequests(): DemoRequest[] {
  const requests: DemoRequest[] = [];

  for (const [i, e] of SEED_ENTRIES.entries()) {
    const iso = categoryWindow(dateStr(-e.daysAgo), e.category).start.toISOString();
    requests.push({
      id: `seed-${i}`,
      title: e.title,
      requestedBy: e.person,
      creditedTo: otherOf(e.person),
      date: iso,
      category: e.category,
      status: "approved",
      createdAt: iso,
    });
  }

  for (const [i, e] of PENDING_ENTRIES.entries()) {
    const iso = categoryWindow(dateStr(e.daysFromNow), e.category).start.toISOString();
    requests.push({
      id: `seed-pending-${i}`,
      title: e.title,
      requestedBy: e.person,
      creditedTo: otherOf(e.person),
      date: iso,
      category: e.category,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }

  return requests;
}
