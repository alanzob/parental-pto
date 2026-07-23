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
import { useDemo } from "@/components/demo/demo-provider";
import { DEMO_PEOPLE, otherPerson, type DemoRequest } from "@/lib/demo/types";
import {
  OFF_CATEGORIES,
  DEFAULT_WEIGHTS,
  categoryWindow,
  formatPoints,
  type OffCategory,
} from "@/lib/pto/categories";
import { occurrenceStarts, type Frequency } from "@/lib/pto/recurrence";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "none", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function toDateInput(iso: string | Date): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function NewRequestDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: DemoRequest | null;
}) {
  const { persona, submitRequest, submitRecurringRequest, editRequest } = useDemo();
  const isEdit = !!editing;

  const [title, setTitle] = useState(editing?.title ?? "");
  const [date, setDate] = useState(editing ? toDateInput(editing.date) : toDateInput(new Date()));
  const [category, setCategory] = useState<OffCategory>(editing?.category ?? "evening");
  const [frequency, setFrequency] = useState<Frequency>("none");
  const [endsBy, setEndsBy] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return toDateInput(d);
  });

  const valid = title.trim().length > 0 && !!date;
  const wasApproved = editing?.status === "approved";
  const partnerName = DEMO_PEOPLE[otherPerson(persona)].name;

  const occurrenceCount = useMemo(() => {
    if (frequency === "none" || !valid) return 1;
    return occurrenceStarts(categoryWindow(date, category).start, new Date(endsBy), frequency).length;
  }, [frequency, endsBy, date, category, valid]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const input = { title: title.trim(), date, category };
    if (isEdit && editing) {
      editRequest(editing.id, input);
      toast.success(wasApproved ? `Updated — sent back to ${partnerName} for re-approval.` : "Request updated.");
    } else if (frequency !== "none") {
      submitRecurringRequest(input, frequency, endsBy);
      toast.success(`${occurrenceCount} requests sent to ${partnerName} for approval.`);
      setTitle("");
    } else {
      submitRequest(input);
      toast.success(`Sent to ${partnerName} for approval.`);
      setTitle("");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit request" : "Request time off"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Adjust the date or category." : "Pick a date and what kind of time off it is."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                    {formatPoints(DEFAULT_WEIGHTS[c.value])}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="bg-muted rounded-md p-2 text-sm">
            {formatPoints(DEFAULT_WEIGHTS[category])} banked to {partnerName}{" "}
            {isEdit ? "when re-approved" : "once approved"}.
          </p>

          {isEdit && wasApproved && (
            <p className="border-warning bg-warning/10 text-warning rounded-md border p-2 text-sm">
              This request is already approved. Saving sends it back to {partnerName} for re-approval.
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
                    <Label htmlFor="demo-ends-by">Ends by</Label>
                    <Input
                      id="demo-ends-by"
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

          <DialogFooter>
            <Button type="submit" disabled={!valid}>
              {isEdit
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
