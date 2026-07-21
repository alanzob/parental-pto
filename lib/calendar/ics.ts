import { createEvents, type DateArray, type EventAttributes } from "ics";
import { categoryLabel } from "@/lib/pto/categories";
import type { PtoTransaction } from "@/lib/types";

function toUtcDateArray(iso: string): DateArray {
  const d = new Date(iso);
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ];
}

export function buildIcsFeed(
  householdName: string,
  transactions: PtoTransaction[],
  displayNameByUserId: Map<string, string>,
): { value: string | null; error: Error | null } {
  const events: EventAttributes[] = transactions.map((t) => {
    const start = new Date(t.occurred_at);
    const end = new Date(start.getTime() + t.base_hours * 60 * 60 * 1000);
    const who = displayNameByUserId.get(t.user_id) ?? "Someone";

    return {
      uid: `${t.id}@parental-pto`,
      title: `${who} — ${categoryLabel(t.category, false)}`,
      description: t.note ?? undefined,
      start: toUtcDateArray(start.toISOString()),
      startInputType: "utc",
      startOutputType: "utc",
      end: toUtcDateArray(end.toISOString()),
      endInputType: "utc",
      endOutputType: "utc",
      status: "CONFIRMED",
      busyStatus: "BUSY",
    };
  });

  return createEvents(events, {
    calName: `${householdName} — Parental PTO`,
    productId: "-//Parental PTO//EN",
  });
}
