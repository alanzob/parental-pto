"use client";

import { useDemo } from "@/components/demo/demo-provider";
import { DEMO_PEOPLE, type DemoPerson } from "@/lib/demo/types";
import { formatPoints } from "@/lib/pto/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function BalanceCards() {
  const { persona, balanceFor, retroChudActive } = useDemo();
  const people: DemoPerson[] = ["brian", "vanda"];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {people.map((p) => {
        const points = balanceFor(p);
        const isInfinite = retroChudActive && points >= 9999;
        return (
          <Card key={p} className={cn(p === persona && "ring-primary ring-2")}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {DEMO_PEOPLE[p].name}
                {p === persona && (
                  <span className="text-primary font-mono text-xs font-normal">YOU</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {isInfinite ? "∞" : formatPoints(points)}
              </p>
              <p className="text-muted-foreground font-mono text-sm">
                {isInfinite ? "UNLIMITED ME-TIME" : "banked"}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
