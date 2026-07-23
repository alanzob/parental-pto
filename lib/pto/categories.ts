// The four time-off categories. A request is now just a date + one of these,
// and each banks its household-configured weight in points (defaults below).
// Each carries a nominal daily window, used to place the entry on the
// calendar / ICS feed and to render its slice of a calendar cell.

export type OffCategory = "day" | "morning" | "afternoon" | "evening";

export type CategoryMeta = {
  value: OffCategory;
  label: string;
  /** Nominal [startHour, endHour) in local time, for calendar placement. */
  window: [number, number];
};

// Ordered morning → evening → day (day last, since it's the "whole thing").
export const OFF_CATEGORIES: CategoryMeta[] = [
  { value: "morning", label: "Morning off", window: [8, 12] },
  { value: "afternoon", label: "Afternoon off", window: [12, 17] },
  { value: "evening", label: "Evening off", window: [17, 22] },
  { value: "day", label: "Day off", window: [8, 22] },
];

export const DEFAULT_WEIGHTS: Record<OffCategory, number> = {
  day: 3,
  morning: 1,
  afternoon: 1,
  evening: 1,
};

export type CategoryWeights = Record<OffCategory, number>;

export function categoryMeta(value: OffCategory): CategoryMeta {
  return OFF_CATEGORIES.find((c) => c.value === value) ?? OFF_CATEGORIES[0];
}

export function categoryLabel(value: OffCategory): string {
  return categoryMeta(value).label;
}

export function formatPoints(points: number): string {
  const rounded = Math.round(points * 10) / 10;
  return `${rounded} pt${rounded === 1 ? "" : "s"}`;
}

/** Given a date (yyyy-mm-dd) and category, the local off-duty start / back-on
 * -duty Date pair from the category's nominal window. Used to fill the
 * occurred_at / duration fields the calendar and ICS feed read. */
export function categoryWindow(date: string, value: OffCategory): { start: Date; end: Date } {
  const [sh, eh] = categoryMeta(value).window;
  const [y, m, d] = date.split("-").map(Number);
  const start = new Date(y, m - 1, d, sh, 0, 0, 0);
  const end = new Date(y, m - 1, d, eh, 0, 0, 0);
  return { start, end };
}
