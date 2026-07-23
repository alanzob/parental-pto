import { createEvents, type DateArray, type EventAttributes } from "ics";
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
  manualPartnerName?: string | null,
): { value: string | null; error: Error | null } {
  const events: EventAttributes[] = transactions.map((t) => {
    const start = new Date(t.occurred_at);
    const end = new Date(start.getTime() + t.base_hours * 60 * 60 * 1000);
    // initiated_by is whoever is actually off duty during this window —
    // user_id is the partner being credited, not who the calendar block is
    // for. Null means the manual (unsigned-up) partner was off duty.
    const who =
      t.initiated_by === null
        ? (manualPartnerName ?? "Someone")
        : (displayNameByUserId.get(t.initiated_by) ?? "Someone");

    return {
      uid: `${t.id}@parental-pto`,
      title: `${who} — ${t.title}`,
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
    calName: `${householdName} — MyTO`,
    productId: "-//MyTO//EN",
  });
}
