"use client";

import { useState } from "react";
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
import { DEMO_PEOPLE, computeDuration, formatDuration, otherPerson } from "@/lib/demo/types";
import { toast } from "sonner";

function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function NewRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { persona, submitRequest } = useDemo();
  const [title, setTitle] = useState("");
  const [offDutyStart, setOffDutyStart] = useState(() => toLocalDatetimeInput(new Date()));
  const [backOnDuty, setBackOnDuty] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalDatetimeInput(d);
  });

  const preview = computeDuration(offDutyStart, backOnDuty);
  const valid = title.trim().length > 0 && backOnDuty > offDutyStart;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    submitRequest({ title: title.trim(), offDutyStart, backOnDuty });
    toast.success(`Sent to ${DEMO_PEOPLE[otherPerson(persona)].name} for approval.`);
    onOpenChange(false);
    setTitle("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request time off</DialogTitle>
          <DialogDescription>
            Like a car rental: when do you go off duty, and when are you back?
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
          {valid && (
            <p className="bg-muted rounded-md p-2 text-sm">
              {formatDuration(preview.fullDays, preview.hours)} — banked to{" "}
              {DEMO_PEOPLE[otherPerson(persona)].name} once approved.
            </p>
          )}
          {!valid && backOnDuty && backOnDuty <= offDutyStart && (
            <p className="text-destructive text-sm">
              &quot;Back on duty&quot; must be after &quot;Off duty starting&quot;.
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={!valid}>
              Submit for approval
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
