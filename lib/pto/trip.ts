// Multi-day trip math — mirrors trip_weight() in migration 0011 exactly,
// for the live point-total preview in the request dialog. The server is
// the source of truth (this is preview-only); keep both in sync if the
// credit rules ever change.
import type { CategoryWeights, OffCategory } from "./categories";

export type TripPeriod = "morning" | "afternoon" | "evening";

export const TRIP_PERIODS: { value: TripPeriod; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

// [startHour, endHour) — same windows as the single-day categories.
const PERIOD_HOURS: Record<TripPeriod, [number, number]> = {
  morning: [8, 12],
  afternoon: [12, 17],
  evening: [17, 22],
};

function dateOnly(date: string, hour: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 0, 0, 0);
}

/** Off-duty-start / back-on-duty Date pair for a trip spanning startDate's
 * departure period through endDate's return period. */
export function tripWindow(
  startDate: string,
  departurePeriod: TripPeriod,
  endDate: string,
  returnPeriod: TripPeriod,
): { start: Date; end: Date } {
  const start = dateOnly(startDate, PERIOD_HOURS[departurePeriod][0]);
  const end = dateOnly(endDate, PERIOD_HOURS[returnPeriod][1]);
  return { start, end };
}

function calendarDayDiff(startDate: string, endDate: string): number {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

/** Departure day (morning=full day, afternoon=aft+eve, evening=eve only) +
 * a full day-weight per calendar day strictly between the two dates +
 * return day (morning=morning only, afternoon=morning+aft, evening=full
 * day) — see migration 0011 for the rationale. */
export function tripWeight(
  weights: CategoryWeights,
  startDate: string,
  departurePeriod: TripPeriod,
  endDate: string,
  returnPeriod: TripPeriod,
): number {
  const middleDays = Math.max(0, calendarDayDiff(startDate, endDate) - 1);

  const departureCredit =
    departurePeriod === "morning"
      ? weights.day
      : departurePeriod === "afternoon"
        ? weights.afternoon + weights.evening
        : weights.evening;

  const returnCredit =
    returnPeriod === "morning"
      ? weights.morning
      : returnPeriod === "afternoon"
        ? weights.morning + weights.afternoon
        : weights.day;

  return departureCredit + middleDays * weights.day + returnCredit;
}

// Which of the three day-bands (morning/afternoon/evening, top-to-bottom —
// same shape the calendar heatmap already uses for single-day categories)
// a departure or return period fills in on its own day.
export function departureBands(period: TripPeriod): number[] {
  if (period === "morning") return [0, 1, 2];
  if (period === "afternoon") return [1, 2];
  return [2];
}

export function returnBands(period: TripPeriod): number[] {
  if (period === "morning") return [0];
  if (period === "afternoon") return [0, 1];
  return [0, 1, 2];
}

export function periodLabel(period: TripPeriod): string {
  return TRIP_PERIODS.find((p) => p.value === period)?.label ?? period;
}

/** "Coverage blocks" — total morning/afternoon/evening period-units the
 * trip spans (departure day's bands + 3 per full middle day + return
 * day's bands). A display concept distinct from the household-weighted
 * point cost. */
export function tripBlockCount(
  startDate: string,
  departurePeriod: TripPeriod,
  endDate: string,
  returnPeriod: TripPeriod,
): number {
  const middleDays = Math.max(0, calendarDayDiff(startDate, endDate) - 1);
  return departureBands(departurePeriod).length + middleDays * 3 + returnBands(returnPeriod).length;
}

function fmtDayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** "Fri, Nov 1 Evening → Sun, Nov 3 Afternoon" */
export function formatTripSpan(
  startDate: string,
  departurePeriod: TripPeriod,
  endDate: string,
  returnPeriod: TripPeriod,
): string {
  return `${fmtDayLabel(startDate)} ${periodLabel(departurePeriod)} → ${fmtDayLabel(endDate)} ${periodLabel(returnPeriod)}`;
}

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** Expands a trip into one calendar-cell-worth of {date, category} entries
 * per day it spans — the departure day gets whichever single-day
 * category(s) sum to its bands, middle days are full 'day' entries, the
 * return day likewise. Reuses the calendar heatmap's existing per-day
 * band rendering unchanged: multiple entries for the same date+person
 * union their bands (see components/pto/calendar-heatmap.tsx). */
export function tripCalendarEntries(
  startDate: string,
  departurePeriod: TripPeriod,
  endDate: string,
  returnPeriod: TripPeriod,
): { date: string; category: OffCategory }[] {
  const entries: { date: string; category: OffCategory }[] = [];

  if (departurePeriod === "morning") {
    entries.push({ date: startDate, category: "day" });
  } else if (departurePeriod === "afternoon") {
    entries.push({ date: startDate, category: "afternoon" }, { date: startDate, category: "evening" });
  } else {
    entries.push({ date: startDate, category: "evening" });
  }

  const middleDays = Math.max(0, calendarDayDiff(startDate, endDate) - 1);
  for (let i = 1; i <= middleDays; i++) {
    entries.push({ date: addDays(startDate, i), category: "day" });
  }

  if (startDate !== endDate) {
    if (returnPeriod === "morning") {
      entries.push({ date: endDate, category: "morning" });
    } else if (returnPeriod === "afternoon") {
      entries.push({ date: endDate, category: "morning" }, { date: endDate, category: "afternoon" });
    } else {
      entries.push({ date: endDate, category: "day" });
    }
  }

  return entries;
}
