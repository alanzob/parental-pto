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
import { TRIP_PERIODS, tripWeight, type TripPeriod } from "@/lib/pto/trip";
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
  const editingIsTrip = editing?.category === "trip";

  const [title, setTitle] = useState(editing?.title ?? "");
  const [date, setDate] = useState(editing ? toDateInput(editing.date) : toDateInput(new Date()));
  const [endDate, setEndDate] = useState(
    editing?.endDate ? toDateInput(editing.endDate) : editing ? toDateInput(editing.date) : toDateInput(new Date()),
  );
  const [category, setCategory] = useState<OffCategory>(
    editingIsTrip ? "evening" : ((editing?.category as OffCategory) ?? "evening"),
  );
  const [departurePeriod, setDeparturePeriod] = useState<TripPeriod>(editing?.departurePeriod ?? "evening");
  const [returnPeriod, setReturnPeriod] = useState<TripPeriod>(editing?.returnPeriod ?? "evening");
  const [frequency, setFrequency] = useState<Frequency>("none");
  const [endsBy, setEndsBy] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return toDateInput(d);
  });

  const isTrip = endDate > date;
  const valid = title.trim().length > 0 && !!date && !!endDate && endDate >= date;
  const wasApproved = editing?.status === "approved";
  const partnerName = DEMO_PEOPLE[otherPerson(persona)].name;

  const weight = useMemo(() => {
    if (isTrip) return tripWeight(DEFAULT_WEIGHTS, date, departurePeriod, endDate, returnPeriod);
    return DEFAULT_WEIGHTS[category];
  }, [isTrip, date, endDate, departurePeriod, returnPeriod, category]);

  const occurrenceCount = useMemo(() => {
    if (isTrip || frequency === "none" || !valid) return 1;
    return occurrenceStarts(categoryWindow(date, category).start, new Date(endsBy), frequency).length;
  }, [isTrip, frequency, endsBy, date, category, valid]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const input = {
      title: title.trim(),
      date,
      category: (isTrip ? "trip" : category) as OffCategory | "trip",
      endDate: isTrip ? endDate : undefined,
      departurePeriod: isTrip ? departurePeriod : undefined,
      returnPeriod: isTrip ? returnPeriod : undefined,
    };
    if (isEdit && editing) {
      editRequest(editing.id, input);
      toast.success(wasApproved ? `Updated — sent back to ${partnerName} for re-approval.` : "Request updated.");
    } else if (!isTrip && frequency !== "none") {
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
          <DialogTitle>{isEdit ? "Edit Me Time" : "Claim Me Time"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changing the title alone saves instantly; changing dates or times recalculates the points and resends it for approval."
              : "Pick the dates and what kind of Me Time it is."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Name this request</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner with friends, or Lake House weekend"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">Start date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (endDate < e.target.value) setEndDate(e.target.value);
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="demo-end-date">End date</Label>
              <Input
                id="demo-end-date"
                type="date"
                value={endDate}
                min={date}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {isTrip ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Departure — {date}</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TRIP_PERIODS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setDeparturePeriod(p.value)}
                      aria-pressed={departurePeriod === p.value}
                      className={cn(
                        "border-border rounded-sm border px-2 py-1.5 text-sm transition-colors",
                        departurePeriod === p.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Return — {endDate}</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TRIP_PERIODS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setReturnPeriod(p.value)}
                      aria-pressed={returnPeriod === p.value}
                      className={cn(
                        "border-border rounded-sm border px-2 py-1.5 text-sm transition-colors",
                        returnPeriod === p.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
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
          )}

          <p className="bg-muted rounded-md p-2 text-sm">
            {formatPoints(weight)} banked to {partnerName}{" "}
            {isEdit ? "when re-approved" : "once approved"}.
          </p>

          {isEdit && wasApproved && (
            <p className="border-warning bg-warning/10 text-warning rounded-md border p-2 text-sm">
              This request is already approved. Only a title change saves instantly — changing
              dates or times sends it back to {partnerName} for re-approval.
            </p>
          )}

          {!isEdit && !isTrip && (
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
          {!isEdit && isTrip && (
            <p className="text-muted-foreground text-xs">
              Multi-day trips are always one-off — Repeat isn&apos;t available for them.
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={!valid}>
              {isEdit
                ? "Save changes"
                : frequency !== "none" && !isTrip
                  ? `Submit ${occurrenceCount} for approval`
                  : "Submit for approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
