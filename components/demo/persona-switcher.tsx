"use client";

import { useDemo } from "@/components/demo/demo-provider";
import { DEMO_PEOPLE, type DemoPerson } from "@/lib/demo/types";
import { cn } from "@/lib/utils";

export function PersonaSwitcher() {
  const { persona, setPersona } = useDemo();

  return (
    <div className="bg-muted flex items-center gap-1 rounded-lg p-1 text-sm">
      <span className="text-muted-foreground px-2">Viewing as</span>
      {(Object.keys(DEMO_PEOPLE) as DemoPerson[]).map((p) => (
        <button
          key={p}
          onClick={() => setPersona(p)}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            persona === p
              ? "bg-primary text-primary-foreground"
              : "hover:bg-background/60",
          )}
        >
          {DEMO_PEOPLE[p].name}
        </button>
      ))}
    </div>
  );
}
