import type { PtoTransaction } from "@/lib/types";
import { categoryLabel, formatPoints, type OffCategory } from "@/lib/pto/categories";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PersonRef = { id: string | null; display_name: string | null };

function fmtDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RequestsList({
  requests,
  me,
  partner,
  onRespond,
  onEdit,
  onCancel,
}: {
  requests: PtoTransaction[];
  me: PersonRef;
  partner: PersonRef | null;
  onRespond: (id: string, approve: boolean) => void;
  onEdit: (request: PtoTransaction) => void;
  onCancel: (request: PtoTransaction) => void;
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

  function nameFor(userId: string | null) {
    if (userId === me.id) return "You";
    if (partner && userId === partner.id) return partner.display_name ?? "Partner";
    return "—";
  }

  return (
    <Card>
      <CardContent className="divide-y p-0">
        {requests.map((r) => {
          const cat = r.category ? categoryLabel(r.category as OffCategory) : "Time off";
          const canRespond = r.status === "pending" && r.user_id === me.id;
          const canManage =
            (r.status === "pending" || r.status === "approved") && r.initiated_by === me.id;
          return (
            <div
              key={r.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {r.title}
                  {r.status === "cancelled" && (
                    <span className="text-muted-foreground ml-1.5 font-normal line-through">
                      cancelled
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground font-mono text-xs">
                  {nameFor(r.initiated_by)} · {cat} · {fmtDate(new Date(r.occurred_at))} ·{" "}
                  {formatPoints(r.final_cost)} banked to {nameFor(r.user_id)}
                  {r.note && ` · ${r.note}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge
                  variant={
                    r.status === "approved"
                      ? "success"
                      : r.status === "denied"
                        ? "destructive"
                        : r.status === "cancelled"
                          ? "outline"
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
                {canManage && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onEdit(r)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onCancel(r)}>
                      Cancel
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
