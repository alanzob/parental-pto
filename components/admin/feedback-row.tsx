"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug",
  feature: "Idea",
  general: "General",
};

export function FeedbackRow({
  id,
  category,
  message,
  email,
  createdAt,
  resolved,
}: {
  id: string;
  category: string;
  message: string;
  email: string | null;
  createdAt: string;
  resolved: boolean;
}) {
  const router = useRouter();
  const [isResolved, setIsResolved] = useState(resolved);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !isResolved;
    setIsResolved(next);
    startTransition(async () => {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: next }),
      });
      if (!res.ok) {
        setIsResolved(!next);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{CATEGORY_LABELS[category] ?? category}</Badge>
          <span className="text-muted-foreground font-mono text-xs">
            {new Date(createdAt).toLocaleString()}
          </span>
          {email && <span className="text-muted-foreground font-mono text-xs">{email}</span>}
        </div>
        <p className="mt-1 text-sm whitespace-pre-wrap">{message}</p>
      </div>
      <Button
        size="sm"
        variant={isResolved ? "outline" : "default"}
        onClick={toggle}
        disabled={pending}
        className="shrink-0"
      >
        {isResolved ? "Resolved" : "Mark resolved"}
      </Button>
    </div>
  );
}
