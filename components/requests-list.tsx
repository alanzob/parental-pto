import type { PtoTransaction } from "@/lib/types";
import { formatDuration } from "@/lib/duration";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PersonRef = { id: string; display_name: string | null };

function fmt(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RequestsList({
  requests,
  me,
  partner,
  onRespond,
}: {
  requests: PtoTransaction[];
  me: PersonRef;
  partner: PersonRef | null;
  onRespond: (id: string, approve: boolean) => void;
}) {
  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          No activity yet.
        </CardContent>
      </Card>
    );
  }

  function nameFor(userId: string) {
    if (userId === me.id) return "You";
    if (partner && userId === partner.id) return partner.display_name ?? "Partner";
    return "—";
  }

  return (
    <Card>
      <CardContent className="divide-y p-0">
        {requests.map((r) => {
          const start = new Date(r.occurred_at);
          const end = new Date(start.getTime() + r.base_hours * 60 * 60 * 1000);
          const duration = formatDuration(Math.floor(r.base_hours / 24), r.base_hours % 24);
          const canRespond = r.status === "pending" && r.user_id === me.id;
          return (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-muted-foreground font-mono text-xs">
                  {nameFor(r.initiated_by)} off duty {fmt(start)} → back {fmt(end)} ·{" "}
                  {duration}
                  {r.multiplier !== 1 && ` · ${r.multiplier}x peak`} · banked to{" "}
                  {nameFor(r.user_id)}
                  {r.note && ` · ${r.note}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant={
                    r.status === "approved"
                      ? "success"
                      : r.status === "denied"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {r.status}
                </Badge>
                {canRespond && (
                  <>
                    <Button size="sm" onClick={() => onRespond(r.id, true)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onRespond(r.id, false)}>
                      Deny
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
