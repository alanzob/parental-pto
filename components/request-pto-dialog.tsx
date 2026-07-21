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
import { computeDuration, formatDuration } from "@/lib/duration";
import type { Household } from "@/lib/types";

function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function RequestPtoDialog({
  household,
  partnerName,
  open,
  onOpenChange,
  onSubmit,
}: {
  household: Household;
  partnerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    title: string;
    offDutyStart: string;
    backOnDuty: string;
    note: string;
  }) => Promise<boolean>;
}) {
  // Remounted via `key` each time it opens (see dashboard-client.tsx), so
  // these initial values are fresh per open without needing an effect.
  const [title, setTitle] = useState("");
  const [offDutyStart, setOffDutyStart] = useState(() => toLocalDatetimeInput(new Date()));
  const [backOnDuty, setBackOnDuty] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return toLocalDatetimeInput(d);
  });
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const valid = title.trim().length > 0 && backOnDuty > offDutyStart;
  const preview = backOnDuty > offDutyStart ? computeDuration(offDutyStart, backOnDuty) : null;

  const isPeakPreview = useMemo(() => {
    const timePart = offDutyStart.split("T")[1];
    if (!timePart) return false;
    return (
      timePart >= household.peak_window_start.slice(0, 5) &&
      timePart < household.peak_window_end.slice(0, 5)
    );
  }, [offDutyStart, household]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    const ok = await onSubmit({
      title: title.trim(),
      offDutyStart: new Date(offDutyStart).toISOString(),
      backOnDuty: new Date(backOnDuty).toISOString(),
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
            Like a car rental: when do you go off duty, and when are you back?
            {partnerName} banks the equivalent credit once they approve.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Name this request</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Trip to Cali"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="off-duty">Off duty starting</Label>
              <Input
                id="off-duty"
                type="datetime-local"
                value={offDutyStart}
                onChange={(e) => setOffDutyStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="back-on-duty">Back on duty</Label>
              <Input
                id="back-on-duty"
                type="datetime-local"
                value={backOnDuty}
                onChange={(e) => setBackOnDuty(e.target.value)}
                required
              />
            </div>
          </div>

          {preview && (
            <p className="bg-muted rounded-md p-2 text-sm">
              {formatDuration(preview.fullDays, preview.hours)}
              {isPeakPreview &&
                ` — ${household.peak_multiplier}x peak rate applies (starts in the household's peak window)`}{" "}
              — banked to {partnerName} once approved.
            </p>
          )}
          {backOnDuty <= offDutyStart && (
            <p className="text-destructive text-sm">
              &quot;Back on duty&quot; must be after &quot;Off duty starting&quot;.
            </p>
          )}

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
            <Button type="submit" disabled={submitting || !valid}>
              {submitting ? "Sending…" : "Submit for approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
