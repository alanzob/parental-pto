import { computeDuration, type DemoPerson, type DemoRequest } from "./types";

// A believable ~15 months of a two-parent household trading off time.
//
// Each entry has an explicit start-of-day time and a duration that actually
// fits its title: evenings happen in the evening, overnights cross midnight,
// the two-night trips read as "1 Full Day, 20 Hours". Times are varied (not
// all stamped with the generation clock), the mix isn't gender-coded, and the
// spacing is uneven — clustered early, spreading out as the couple find a
// rhythm.
//
// The cumulative "who's owed" disparity still tells the intended arc: it
// swings hard early (a rough stretch where one partner is away a lot, then an
// over-correction the other way) and damps into small, frequent, reciprocal
// breaks that hover near even — making time for each other to make time for
// themselves. "person" is whoever goes off duty; their partner banks the
// credit. Dates are computed relative to now so the demo never goes stale.
type SeedEntry = {
  title: string;
  person: DemoPerson;
  startHour: number;
  startMin: number;
  durationHours: number;
  daysAgo: number;
};

const SEED_ENTRIES: SeedEntry[] = [
  // Leg 1 — Brian's away a lot (new-role travel stretch): climbs steeply.
  { title: "Work conference — Austin", person: "brian", startHour: 17, startMin: 0, durationHours: 44, daysAgo: 451 },
  // Leg 2 — Vanda evens it out, then overshoots the other way.
  { title: "Weekend at her sister's", person: "vanda", startHour: 16, startMin: 0, durationHours: 44, daysAgo: 436 },
  { title: "Priya's wedding — stayed over", person: "vanda", startHour: 15, startMin: 0, durationHours: 16, daysAgo: 421 },
  { title: "Solo overnight to recharge", person: "vanda", startHour: 16, startMin: 0, durationHours: 16, daysAgo: 406 },
  { title: "Morning hike + brunch", person: "vanda", startHour: 7, startMin: 30, durationHours: 5, daysAgo: 392 },
  // Leg 3 — Brian's turn, a smaller peak.
  { title: "Work conference — Denver", person: "brian", startHour: 17, startMin: 0, durationHours: 44, daysAgo: 372 },
  { title: "Jaime's birthday dinner", person: "brian", startHour: 18, startMin: 30, durationHours: 6, daysAgo: 356 },
  { title: "Pickup soccer + beers after", person: "brian", startHour: 9, startMin: 0, durationHours: 6, daysAgo: 341 },
  // Leg 4 — Vanda drifts back down; the swings start narrowing.
  { title: "Work trip — Portland", person: "vanda", startHour: 18, startMin: 0, durationHours: 14, daysAgo: 322 },
  { title: "Pottery class + coffee", person: "vanda", startHour: 10, startMin: 0, durationHours: 6, daysAgo: 305 },
  { title: "Dinner and a late movie", person: "vanda", startHour: 18, startMin: 30, durationHours: 5, daysAgo: 288 },
  { title: "Museum afternoon, solo", person: "vanda", startHour: 13, startMin: 0, durationHours: 4, daysAgo: 270 },
  { title: "Book club", person: "vanda", startHour: 19, startMin: 0, durationHours: 4, daysAgo: 251 },
  // Leg 5 — Brian nudges back toward even.
  { title: "Concert at the Fillmore", person: "brian", startHour: 19, startMin: 30, durationHours: 5, daysAgo: 230 },
  { title: "Dentist, then errands", person: "brian", startHour: 13, startMin: 0, durationHours: 4, daysAgo: 208 },
  { title: "Drinks with the team", person: "brian", startHour: 18, startMin: 0, durationHours: 5, daysAgo: 183 },
  { title: "Long morning run", person: "brian", startHour: 7, startMin: 0, durationHours: 3, daysAgo: 157 },
  // Settled rhythm — small, frequent, reciprocal.
  { title: "Spa afternoon", person: "vanda", startHour: 13, startMin: 30, durationHours: 4, daysAgo: 126 },
  { title: "Dinner with old friends", person: "brian", startHour: 19, startMin: 0, durationHours: 4, daysAgo: 96 },
  { title: "Afternoon to read", person: "vanda", startHour: 14, startMin: 0, durationHours: 3, daysAgo: 64 },
  { title: "Coffee and record shopping", person: "brian", startHour: 10, startMin: 0, durationHours: 3, daysAgo: 33 },
  { title: "Quiet morning to herself", person: "vanda", startHour: 8, startMin: 0, durationHours: 3, daysAgo: 12 },
];

// A couple of small requests still on the books, awaiting the other partner.
const PENDING_ENTRIES: (Omit<SeedEntry, "daysAgo"> & { daysFromNow: number })[] = [
  { title: "Half-day for a dentist appointment", person: "brian", startHour: 13, startMin: 0, durationHours: 4, daysFromNow: 4 },
  { title: "Afternoon to herself", person: "vanda", startHour: 13, startMin: 30, durationHours: 3, daysFromNow: 8 },
];

function otherOf(p: DemoPerson): DemoPerson {
  return p === "brian" ? "vanda" : "brian";
}

function atDay(base: Date, dayOffset: number, hour: number, min: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, min, 0, 0);
  return d;
}

export function seedDemoRequests(): DemoRequest[] {
  const now = new Date();
  const requests: DemoRequest[] = [];

  for (const [i, e] of SEED_ENTRIES.entries()) {
    const offDutyStart = atDay(now, -e.daysAgo, e.startHour, e.startMin);
    const backOnDuty = new Date(offDutyStart.getTime() + e.durationHours * 60 * 60 * 1000);
    const { fullDays, hours } = computeDuration(offDutyStart, backOnDuty);
    requests.push({
      id: `seed-${i}`,
      title: e.title,
      requestedBy: e.person,
      creditedTo: otherOf(e.person),
      offDutyStart: offDutyStart.toISOString(),
      backOnDuty: backOnDuty.toISOString(),
      fullDays,
      hours,
      status: "approved",
      // Planned a week or two ahead of time.
      createdAt: atDay(offDutyStart, -12, 9, 0).toISOString(),
    });
  }

  for (const [i, e] of PENDING_ENTRIES.entries()) {
    const offDutyStart = atDay(now, e.daysFromNow, e.startHour, e.startMin);
    const backOnDuty = new Date(offDutyStart.getTime() + e.durationHours * 60 * 60 * 1000);
    const { fullDays, hours } = computeDuration(offDutyStart, backOnDuty);
    requests.push({
      id: `seed-pending-${i}`,
      title: e.title,
      requestedBy: e.person,
      creditedTo: otherOf(e.person),
      offDutyStart: offDutyStart.toISOString(),
      backOnDuty: backOnDuty.toISOString(),
      fullDays,
      hours,
      status: "pending",
      createdAt: now.toISOString(),
    });
  }

  return requests;
}
