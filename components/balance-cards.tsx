import { formatPoints } from "@/lib/pto/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PersonRef = { id: string | null; display_name: string | null };

function signedPoints(points: number): string {
  return `${points < 0 ? "-" : ""}${formatPoints(Math.abs(points))}`;
}

export function BalanceCards({
  partner,
  myBalance,
  partnerBalance,
}: {
  partner: PersonRef | null;
  myBalance: number;
  partnerBalance: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="ring-primary ring-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            You
            <span className="text-primary font-mono text-xs font-normal">YOU</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {signedPoints(myBalance)}
          </p>
          <p className="text-muted-foreground font-mono text-sm">banked</p>
        </CardContent>
      </Card>
      <Card className={cn(!partner && "border-dashed")}>
        <CardHeader>
          <CardTitle className="text-base">{partner?.display_name ?? "Partner"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {partner ? signedPoints(partnerBalance) : "—"}
          </p>
          <p className="text-muted-foreground font-mono text-sm">
            {partner ? "banked" : "invite them from Settings"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
