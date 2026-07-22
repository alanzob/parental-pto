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
import { occurrenceStarts, type Frequency } from "@/lib/pto/recurrence";
import { cn } from "@/lib/utils";
import type { Household } from "@/lib/types";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "none", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export type RequestDialogInitial = {
  title: string;
  offDutyStart: string; // ISO
  backOnDuty: string; // ISO
  note: string;
};

export function RequestPtoDialog({
  household,
  partnerName,
  open,
  onOpenChange,
  onSubmit,
  mode = "create",
  initial,
  wasApproved = false,
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
    frequency: Frequency;
    endsBy: string | null;
  }) => Promise<boolean>;
  mode?: "create" | "edit";
  initial?: RequestDialogInitial;
  /** In edit mode: whether the request being edited is currently approved,
   * so we can warn that saving will send it back for re-approval. */
  wasApproved?: boolean;
}) {
  const isEdit = mode === "edit";

  // Remounted via `key` each time it opens (see dashboard-client.tsx), so
  // these initial values are fresh per open without needing an effect.
  const [title, setTitle] = useState(initial?.title ?? "");
  const [offDutyStart, setOffDutyStart] = useState(() =>
    toLocalDatetimeInput(initial ? new Date(initial.offDutyStart) : new Date()),
  );
  const [backOnDuty, setBackOnDuty] = useState(() => {
    if (initial) return toLocalDatetimeInput(new Date(initial.backOnDuty));
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return toLocalDatetimeInput(d);
  });
  const [note, setNote] = useState(initial?.note ?? "");
  const [frequency, setFrequency] = useState<Frequency>("none");
  const [endsBy, setEndsBy] = useState(() => {
    const d = new Date(offDutyStart || new Date());
    d.setMonth(d.getMonth() + 2);
    return toDateInput(d);
  });
  const [submitting, setSubmitting] = useState(false);

  const valid = title.trim().length > 0 && backOnDuty > offDutyStart;
  const preview = backOnDuty > offDutyStart ? computeDuration(offDutyStart, backOnDuty) : null;

  const occurrenceCount = useMemo(() => {
    if (frequency === "none" || !valid) return 1;
    return occurrenceStarts(new Date(offDutyStart), new Date(endsBy), frequency).length;
  }, [frequency, endsBy, offDutyStart, valid]);

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
      frequency: isEdit ? "none" : frequency,
      endsBy: !isEdit && frequency !== "none" ? endsBy : null,
    });
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit request" : "Request time off"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Adjust the timing or note for this request."
              : `Like a car rental: when do you go off duty, and when are you back? ${partnerName} banks the equivalent credit once they approve.`}
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
              — banked to {partnerName} {isEdit ? "when re-approved" : "once approved"}.
            </p>
          )}
          {backOnDuty <= offDutyStart && (
            <p className="text-destructive text-sm">
              &quot;Back on duty&quot; must be after &quot;Off duty starting&quot;.
            </p>
          )}

          {isEdit && wasApproved && (
            <p className="border-warning bg-warning/10 text-warning rounded-md border p-2 text-sm">
              This request is already approved. Saving changes sends it back to {partnerName} for
              re-approval, and the banked credit updates only once they approve again.
            </p>
          )}

          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Repeat</Label>
              <div className="flex flex-wrap gap-1.5">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFrequency(f.value)}
                    aria-pressed={frequency === f.value}
                    className={cn(
                      "border-border rounded-sm border px-2.5 py-1 text-xs transition-colors",
                      frequency === f.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {frequency !== "none" && (
                <div className="grid grid-cols-[1fr_auto] items-end gap-3 pt-1.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="ends-by">Ends by</Label>
                    <Input
                      id="ends-by"
                      type="date"
                      value={endsBy}
                      onChange={(e) => setEndsBy(e.target.value)}
                    />
                  </div>
                  <p className="text-muted-foreground pb-2 text-xs">
                    {occurrenceCount} request{occurrenceCount === 1 ? "" : "s"} generated
                    {occurrenceCount >= 52 ? " (max)" : ""}
                  </p>
                </div>
              )}
            </div>
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
              {submitting
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : frequency !== "none"
                    ? `Submit ${occurrenceCount} for approval`
                    : "Submit for approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
