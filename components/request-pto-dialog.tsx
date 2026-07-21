"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DURATION_PRESETS,
  PTO_CATEGORIES,
  categoryLabel,
  type PtoCategory,
} from "@/lib/pto/categories";
import type { Household } from "@/lib/types";
import { cn } from "@/lib/utils";

function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

const CUSTOM = "custom" as const;

export function RequestPtoDialog({
  defaultCategory,
  household,
  open,
  onOpenChange,
  onSubmit,
  chudMode,
}: {
  /** Preselected category (from a balance card), or null to let the user
   * pick — used when opened from the dashboard's generic quick action. */
  defaultCategory: PtoCategory | null;
  household: Household;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    category: PtoCategory;
    hours: number;
    occurredAt: string;
    note: string;
  }) => Promise<boolean>;
  chudMode: boolean;
}) {
  // Remounted via `key` each time it opens (see dashboard-client.tsx), so
  // these initial values are fresh per open without needing an effect.
  const [category, setCategory] = useState<PtoCategory>(
    defaultCategory ?? PTO_CATEGORIES[0],
  );
  const presets = DURATION_PRESETS[category];
  const [selection, setSelection] = useState<number | typeof CUSTOM>(0);
  const [customHours, setCustomHours] = useState("2");
  const [when, setWhen] = useState(() => toLocalDatetimeInput(new Date()));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hours =
    selection === CUSTOM
      ? parseFloat(customHours)
      : (DURATION_PRESETS[category][selection]?.hours ?? NaN);

  const isPeakPreview = useMemo(() => {
    const timePart = when.split("T")[1];
    if (!timePart) return false;
    return (
      timePart >= household.peak_window_start.slice(0, 5) &&
      timePart < household.peak_window_end.slice(0, 5)
    );
  }, [when, household]);

  const previewCost = useMemo(() => {
    if (isNaN(hours) || hours <= 0) return null;
    const multiplier = isPeakPreview ? household.peak_multiplier : 1;
    return (hours * multiplier).toFixed(1);
  }, [hours, isPeakPreview, household.peak_multiplier]);

  function changeCategory(next: PtoCategory) {
    setCategory(next);
    setSelection(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isNaN(hours) || hours <= 0) return;
    setSubmitting(true);
    const ok = await onSubmit({
      category,
      hours,
      occurredAt: new Date(when).toISOString(),
      note,
    });
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request time off</DialogTitle>
          <DialogDescription>
            The final cost is calculated on the server using your
            household&apos;s peak-hour settings — this preview is approximate.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => changeCategory(v as PtoCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PTO_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryLabel(c, chudMode)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Duration</Label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset, i) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setSelection(i)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm",
                    selection === i
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelection(CUSTOM)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  selection === CUSTOM
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                Custom
              </button>
            </div>
            {selection === CUSTOM && (
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                placeholder="Hours"
                className="mt-2"
                required
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="when">When</Label>
            <Input
              id="when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
            />
            {isPeakPreview && (
              <p className="text-muted-foreground text-xs">
                Falls in the household&apos;s peak window (
                {household.peak_multiplier}x) — likely {previewCost}h total.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || isNaN(hours) || hours <= 0}>
              {submitting ? "Logging…" : "Log request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
