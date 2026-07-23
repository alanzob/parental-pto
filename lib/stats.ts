import { createServiceRoleClient } from "@/lib/supabase/server";

export type PublicStats = {
  householdsTradingOff: number;
  timesCoveredForEachOther: number;
  hoursBanked: number;
};

const EMPTY_STATS: PublicStats = {
  householdsTradingOff: 0,
  timesCoveredForEachOther: 0,
  hoursBanked: 0,
};

/**
 * Real, live counts for the public-facing "this is actually being used"
 * strip — not sample data. Deliberately conservative (a "paired" household
 * needs two profiles, a "covered for each other" event needs an approved
 * request) so the numbers hold up under scrutiny rather than flattering the
 * app at the cost of being technically misleading.
 */
export async function getPublicStats(): Promise<PublicStats> {
  const serviceClient = createServiceRoleClient();

  const [{ data: profiles }, { data: approved }] = await Promise.all([
    serviceClient.from("profiles").select("id, household_id"),
    serviceClient
      .from("pto_transactions")
      .select("household_id, base_hours")
      .eq("status", "approved"),
  ]);

  if (!profiles || !approved) return EMPTY_STATS;

  const memberCounts = new Map<string, number>();
  for (const p of profiles) {
    if (!p.household_id) continue;
    memberCounts.set(p.household_id, (memberCounts.get(p.household_id) ?? 0) + 1);
  }
  const pairedHouseholdIds = new Set(
    Array.from(memberCounts.entries())
      .filter(([, count]) => count >= 2)
      .map(([id]) => id),
  );

  const approvedInPairedHouseholds = approved.filter((t) =>
    pairedHouseholdIds.has(t.household_id),
  );

  const tradingHouseholds = new Set(approvedInPairedHouseholds.map((t) => t.household_id));
  const hoursBanked = approvedInPairedHouseholds.reduce(
    (sum, t) => sum + (t.base_hours ?? 0),
    0,
  );

  return {
    householdsTradingOff: tradingHouseholds.size,
    timesCoveredForEachOther: approvedInPairedHouseholds.length,
    hoursBanked: Math.round(hoursBanked),
  };
}
