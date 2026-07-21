export type PtoCategory = "afternoon_night_off" | "day_away" | "passive_pto";

export const PTO_CATEGORIES: PtoCategory[] = [
  "afternoon_night_off",
  "day_away",
  "passive_pto",
];

const LABELS: Record<PtoCategory, string> = {
  afternoon_night_off: "Afternoon / Night Off",
  day_away: "Day Away",
  passive_pto: "Passive PTO",
};

// chud_mode is purely cosmetic and client-only — see components/chud-mode-provider.tsx.
// It never touches Supabase and resets on refresh.
const CHUD_LABELS: Partial<Record<PtoCategory, string>> = {
  passive_pto: "Sitting Around",
};

export function categoryLabel(category: PtoCategory, chudMode: boolean): string {
  if (chudMode && CHUD_LABELS[category]) {
    return CHUD_LABELS[category]!;
  }
  return LABELS[category];
}

export type DurationPreset = { label: string; hours: number };

// Quick-pick presets shown in the request dialog before falling back to a
// custom hours input — most requests are "an afternoon" or "a whole day",
// not an arbitrary number of hours.
export const DURATION_PRESETS: Record<PtoCategory, DurationPreset[]> = {
  afternoon_night_off: [
    { label: "Afternoon (4h)", hours: 4 },
    { label: "Night (4h)", hours: 4 },
    { label: "Full day (8h)", hours: 8 },
  ],
  day_away: [
    { label: "Full day (8h)", hours: 8 },
    { label: "Weekend (16h)", hours: 16 },
  ],
  passive_pto: [
    { label: "A few hours (3h)", hours: 3 },
    { label: "Full day (8h)", hours: 8 },
  ],
};
