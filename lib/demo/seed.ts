import { computeDuration, type DemoPerson, type DemoRequest } from "./types";

// A damped oscillation, not a straight line: wide, dramatic swings while
// nobody's watching the balance, narrowing over time as both partners start
// reacting to it sooner — the point isn't to land exactly on zero, it's to
// stop letting the gap run unchecked. Hours are the credited amount per
// event; "person" is whoever goes off duty (their partner banks the credit).
// Dates are computed relative to "now" at generation time, not hardcoded,
// so the demo never looks stale.
const SEED_EVENTS: { title: string; person: DemoPerson; hours: number; daysAgo: number }[] = [
  // Leg 1: climbs to +24 favoring Vanda — Brian's away a lot, nobody's tracking it yet.
  { title: "Guys' fishing weekend", person: "brian", hours: 8, daysAgo: 462 },
  { title: "Work conference out of town", person: "brian", hours: 9, daysAgo: 446 },
  { title: "Golf trip with college friends", person: "brian", hours: 7, daysAgo: 429 },
  // Leg 2: swings all the way to -24 favoring Brian — the overcorrection.
  { title: "Solo trip to recharge", person: "vanda", hours: 20, daysAgo: 412 },
  { title: "Weekend hiking retreat with friends", person: "vanda", hours: 18, daysAgo: 394 },
  { title: "Visit her sister for a long weekend", person: "vanda", hours: 10, daysAgo: 377 },
  // Leg 3: back up, smaller peak (+18) — the swings start narrowing.
  { title: "Overnight work trip", person: "brian", hours: 14, daysAgo: 360 },
  { title: "Bachelor party for his brother", person: "brian", hours: 16, daysAgo: 343 },
  { title: "Fantasy football draft weekend", person: "brian", hours: 12, daysAgo: 326 },
  // Leg 4: down to -16.
  { title: "Spa weekend with her mom", person: "vanda", hours: 19, daysAgo: 309 },
  { title: "Girls' trip to the coast", person: "vanda", hours: 15, daysAgo: 292 },
  // Leg 5: up to +11.
  { title: "Camping trip with buddies", person: "brian", hours: 15, daysAgo: 275 },
  { title: "Work off-site", person: "brian", hours: 12, daysAgo: 258 },
  // Leg 6: down to -9.
  { title: "Yoga retreat", person: "vanda", hours: 11, daysAgo: 241 },
  { title: "Visit her college roommate", person: "vanda", hours: 9, daysAgo: 224 },
  // Leg 7: up to +6.
  { title: "Concert weekend with friends", person: "brian", hours: 9, daysAgo: 207 },
  { title: "Half-day golf outing", person: "brian", hours: 6, daysAgo: 190 },
  // Leg 8: down to -5.
  { title: "Overnight girls' trip", person: "vanda", hours: 6, daysAgo: 173 },
  { title: "Afternoon spa break", person: "vanda", hours: 5, daysAgo: 156 },
  // Legs 9-12: small, frequent, reactive — this is the healthy steady state.
  { title: "Quick guys' night away", person: "brian", hours: 8, daysAgo: 139 },
  { title: "Morning off with friends", person: "vanda", hours: 5, daysAgo: 112 },
  { title: "Evening out with friends", person: "brian", hours: 4, daysAgo: 62 },
  { title: "Quiet afternoon alone", person: "vanda", hours: 3, daysAgo: 14 },
];

// A couple of small requests still awaiting the other partner's approval —
// shows the inbox mid-use rather than everything pre-settled.
const PENDING_EVENTS: { title: string; person: DemoPerson; hours: number; daysFromNow: number }[] = [
  { title: "Half-day off for a dentist marathon", person: "brian", hours: 4, daysFromNow: 3 },
  { title: "Afternoon to herself", person: "vanda", hours: 3, daysFromNow: 6 },
];

function otherOf(p: DemoPerson): DemoPerson {
  return p === "brian" ? "vanda" : "brian";
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function seedDemoRequests(): DemoRequest[] {
  const now = new Date();
  const requests: DemoRequest[] = [];

  for (const [i, e] of SEED_EVENTS.entries()) {
    const offDutyStart = addDays(now, -e.daysAgo);
    const backOnDuty = new Date(offDutyStart.getTime() + e.hours * 60 * 60 * 1000);
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
      createdAt: addDays(offDutyStart, -18).toISOString(),
    });
  }

  for (const [i, e] of PENDING_EVENTS.entries()) {
    const offDutyStart = addDays(now, e.daysFromNow);
    const backOnDuty = new Date(offDutyStart.getTime() + e.hours * 60 * 60 * 1000);
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
