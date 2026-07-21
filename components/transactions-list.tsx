import type { PtoTransaction } from "@/lib/types";
import { categoryLabel } from "@/lib/pto/categories";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PersonRef = { id: string; display_name: string | null };

export function TransactionsList({
  transactions,
  me,
  partner,
  chudMode,
}: {
  transactions: PtoTransaction[];
  me: PersonRef;
  partner: PersonRef | null;
  chudMode: boolean;
}) {
  if (transactions.length === 0) {
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
        {transactions.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium">
                {nameFor(t.user_id)} — {categoryLabel(t.category, chudMode)}
              </p>
              <p className="text-muted-foreground text-xs">
                {new Date(t.occurred_at).toLocaleString()}
                {t.multiplier !== 1 && ` · ${t.multiplier}x peak`}
                {t.note && ` · ${t.note}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={t.final_cost < 0 ? "secondary" : "success"}>
                {t.final_cost > 0 ? "+" : ""}
                {t.final_cost.toFixed(1)}h
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
