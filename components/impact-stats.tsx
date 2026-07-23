import type { PublicStats } from "@/lib/stats";

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-muted flex-1 rounded-md px-4 py-3 text-center">
      <p className="font-mono text-2xl leading-none font-semibold tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="label-tag text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}

export function ImpactStats({ stats, className = "" }: { stats: PublicStats; className?: string }) {
  // These are real counts, not sample data — so at near-zero they'd read as
  // "nobody uses this" instead of social proof. Stay quiet until there's an
  // actual number worth showing.
  if (stats.householdsTradingOff === 0) return null;

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <StatTile
        value={stats.householdsTradingOff}
        label={stats.householdsTradingOff === 1 ? "household trading My Time" : "households trading My Time"}
      />
      <StatTile
        value={stats.timesCoveredForEachOther}
        label="times partners covered for each other"
      />
      <StatTile value={stats.hoursBanked} label="hours of My Time banked" />
    </div>
  );
}
