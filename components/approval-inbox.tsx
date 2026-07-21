import type { PtoConversion } from "@/lib/types";
import { categoryLabel } from "@/lib/pto/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ApprovalInbox({
  conversions,
  chudMode,
  onRespond,
}: {
  conversions: PtoConversion[];
  chudMode: boolean;
  onRespond: (id: string, approve: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Awaiting your approval ({conversions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {conversions.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <p className="text-sm">
              Move <span className="font-medium">{c.hours}h</span> from{" "}
              {categoryLabel(c.from_category, chudMode)} to{" "}
              {categoryLabel(c.to_category, chudMode)}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onRespond(c.id, true)}>
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRespond(c.id, false)}
              >
                Deny
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
