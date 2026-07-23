"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo/demo-provider";
import { DEMO_PEOPLE, weightOf, type DemoRequest } from "@/lib/demo/types";
import { categoryLabel, formatPoints } from "@/lib/pto/categories";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewRequestDialog } from "@/components/demo/new-request-dialog";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RequestList() {
  const { persona, requests, approve, deny, cancelRequest } = useDemo();
  const [editing, setEditing] = useState<DemoRequest | null>(null);

  const sorted = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <>
      <Card>
        <CardContent className="divide-y p-0">
          {sorted.map((r) => {
            const canRespond = r.status === "pending" && r.creditedTo === persona;
            const canManage =
              (r.status === "pending" || r.status === "approved") && r.requestedBy === persona;
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
                    {DEMO_PEOPLE[r.requestedBy].name} · {categoryLabel(r.category)} ·{" "}
                    {fmtDate(r.date)} · {formatPoints(weightOf(r.category))} banked to{" "}
                    {DEMO_PEOPLE[r.creditedTo].name}
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
                      <Button size="sm" onClick={() => approve(r.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deny(r.id)}>
                        Deny
                      </Button>
                    </>
                  )}
                  {canManage && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => cancelRequest(r.id)}>
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

      {editing && (
        <NewRequestDialog
          key={`edit-${editing.id}`}
          editing={editing}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
    </>
  );
}
