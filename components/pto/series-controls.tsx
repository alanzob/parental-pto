import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type SeriesSummary = {
  seriesId: string;
  title: string;
  total: number;
  pending: number;
  futureRemaining: number;
  /** Viewer is the credited partner and there are pending instances to act on. */
  canRespond: boolean;
  /** Viewer is the requester and there are future instances to manage. */
  canManage: boolean;
};

// Bulk controls for recurring series — one row per series that still has
// something to act on. Renders nothing if there's no actionable series.
export function SeriesControls({
  series,
  onRespond,
  onCancel,
  onShift,
}: {
  series: SeriesSummary[];
  onRespond: (seriesId: string, approve: boolean) => void;
  onCancel: (seriesId: string) => void;
  onShift: (seriesId: string, days: number) => void;
}) {
  const actionable = series.filter(
    (s) => (s.canRespond && s.pending > 0) || (s.canManage && s.futureRemaining > 0),
  );
  if (actionable.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="label-tag">Recurring series</h2>
      {actionable.map((s) => (
        <Card key={s.seriesId}>
          <CardContent className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-muted-foreground font-mono text-xs">
                {s.total}-part series
                {s.pending > 0 && ` · ${s.pending} pending`}
                {s.futureRemaining > 0 && ` · ${s.futureRemaining} upcoming`}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {s.canRespond && s.pending > 0 && (
                <>
                  <Button size="sm" onClick={() => onRespond(s.seriesId, true)}>
                    Approve all
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onRespond(s.seriesId, false)}>
                    Deny all
                  </Button>
                </>
              )}
              {s.canManage && s.futureRemaining > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    title="Move remaining a week earlier"
                    onClick={() => onShift(s.seriesId, -7)}
                  >
                    −1 wk
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title="Move remaining a week later"
                    onClick={() => onShift(s.seriesId, 7)}
                  >
                    +1 wk
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onCancel(s.seriesId)}>
                    Cancel remaining
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
