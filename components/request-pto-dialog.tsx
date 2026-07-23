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
  OFF_CATEGORIES,
  categoryWindow,
  formatPoints,
  type CategoryWeights,
  type OffCategory,
} from "@/lib/pto/categories";
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

export function weightsFromHousehold(h: Household): CategoryWeights {
  return {
    day: h.category_weight_day,
    morning: h.category_weight_morning,
    afternoon: h.category_weight_afternoon,
    evening: h.category_weight_evening,
  };
}

export type RequestDialogInitial = {
  title: string;
  date: string; // yyyy-mm-dd
  category: OffCategory;
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
    category: OffCategory;
    note: string;
    frequency: Frequency;
    endsBy: string | null;
    forPartner: boolean;
  }) => Promise<boolean>;
  mode?: "create" | "edit";
  initial?: RequestDialogInitial;
  wasApproved?: boolean;
}) {
  const isEdit = mode === "edit";
  const weights = weightsFromHousehold(household);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? toDateInput(new Date()));
  const [category, setCategory] = useState<OffCategory>(initial?.category ?? "evening");
  const [note, setNote] = useState(initial?.note ?? "");
  const [forPartner, setForPartner] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("none");
  const [endsBy, setEndsBy] = useState(() => {
    const d = new Date(initial?.date ?? new Date());
    d.setMonth(d.getMonth() + 2);
    return toDateInput(d);
  });
  const [submitting, setSubmitting] = useState(false);

  const valid = title.trim().length > 0 && !!date;
  const weight = weights[category];
  const isManual = household.partner_mode === "manual";

  const occurrenceCount = useMemo(() => {
    if (frequency === "none" || !valid) return 1;
    return occurrenceStarts(categoryWindow(date, category).start, new Date(endsBy), frequency).length;
  }, [frequency, endsBy, date, category, valid]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    const { start, end } = categoryWindow(date, category);
    const ok = await onSubmit({
      title: title.trim(),
      offDutyStart: start.toISOString(),
      backOnDuty: end.toISOString(),
      category,
      note,
      frequency: isEdit ? "none" : frequency,
      endsBy: !isEdit && frequency !== "none" ? endsBy : null,
      forPartner: !isEdit && isManual && forPartner,
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
              ? "Adjust the date or category for this request."
              : isManual && forPartner
                ? `Pick a date and what kind of time off ${partnerName} took. You bank the points immediately.`
                : `Pick a date and what kind of time off it is. ${partnerName} banks the points once they approve.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && isManual && (
            <div className="space-y-1.5">
              <Label>Who&apos;s this for?</Label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setForPartner(false)}
                  aria-pressed={!forPartner}
                  className={cn(
                    "border-border flex-1 rounded-sm border px-3 py-1.5 text-sm transition-colors",
                    !forPartner
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted",
                  )}
                >
                  You
                </button>
                <button
                  type="button"
                  onClick={() => setForPartner(true)}
                  aria-pressed={forPartner}
                  className={cn(
                    "border-border flex-1 rounded-sm border px-3 py-1.5 text-sm transition-colors",
                    forPartner
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted",
                  )}
                >
                  {partnerName}
                </button>
              </div>
              {forPartner && (
                <p className="text-muted-foreground text-xs">
                  Since {partnerName} isn&apos;t on MyTO yet, logging their time off banks the
                  points to you right away — no approval needed.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Name this request</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner with friends"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <div className="grid grid-cols-2 gap-2">
              {OFF_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  aria-pressed={category === c.value}
                  className={cn(
                    "border-border flex items-center justify-between rounded-sm border px-3 py-2 text-sm transition-colors",
                    category === c.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted",
                  )}
                >
                  <span>{c.label}</span>
                  <span className="font-mono text-xs tabular-nums opacity-80">
                    {formatPoints(weights[c.value])}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="bg-muted rounded-md p-2 text-sm">
            {!isEdit && isManual && forPartner ? (
              <>{formatPoints(weight)} banked to you — updated immediately.</>
            ) : (
              <>
                {formatPoints(weight)} banked to {partnerName}{" "}
                {isEdit ? (isManual ? "— updated immediately" : "when re-approved") : "once approved"}.
              </>
            )}
          </p>

          {isEdit && wasApproved && !isManual && (
            <p className="border-warning bg-warning/10 text-warning rounded-md border p-2 text-sm">
              This request is already approved. Saving changes sends it back to {partnerName} for
              re-approval, and the banked points update only once they approve again.
            </p>
          )}

          {isEdit && wasApproved && isManual && (
            <p className="border-warning bg-warning/10 text-warning rounded-md border p-2 text-sm">
              This request is already approved. Since {partnerName} isn&apos;t on MyTO, saving
              changes updates the banked points immediately — there&apos;s no one to re-approve it.
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
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !valid}>
              {submitting
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : isManual && forPartner
                    ? frequency !== "none"
                      ? `Log ${occurrenceCount} entries`
                      : "Log entry"
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
