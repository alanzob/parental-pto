import { categoryLabel, type PtoCategory } from "@/lib/pto/categories";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function BalanceCard({
  category,
  myBalance,
  partnerBalance,
  partnerName,
  chudMode,
  onRequest,
}: {
  category: PtoCategory;
  myBalance: number;
  partnerBalance: number | null;
  partnerName: string | null | undefined;
  chudMode: boolean;
  onRequest: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {categoryLabel(category, chudMode)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-sm">You</span>
          <span className="text-2xl font-semibold tabular-nums">
            {myBalance.toFixed(1)}h
          </span>
        </div>
        {partnerBalance !== null && (
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-sm">
              {partnerName ?? "Partner"}
            </span>
            <span className="text-muted-foreground text-lg tabular-nums">
              {partnerBalance.toFixed(1)}h
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="secondary" className="w-full" onClick={onRequest}>
          Request time off
        </Button>
      </CardFooter>
    </Card>
  );
}
