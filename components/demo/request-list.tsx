"use client";

import { useDemo } from "@/components/demo/demo-provider";
import { DEMO_PEOPLE, formatDuration } from "@/lib/demo/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RequestList() {
  const { persona, requests, approve, deny } = useDemo();

  const sorted = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Card>
      <CardContent className="divide-y p-0">
        {sorted.map((r) => {
          const canRespond = r.status === "pending" && r.creditedTo === persona;
          return (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-muted-foreground font-mono text-xs">
                  {DEMO_PEOPLE[r.requestedBy].name} off duty {fmt(r.offDutyStart)} → back{" "}
                  {fmt(r.backOnDuty)} · {formatDuration(r.fullDays, r.hours)} banked to{" "}
                  {DEMO_PEOPLE[r.creditedTo].name}
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
                    <Button size="sm" onClick={() => approve(r.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deny(r.id)}>
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
