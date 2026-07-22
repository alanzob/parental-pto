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
import {
  DEMO_PEOPLE,
  computeDuration,
  formatDuration,
  otherPerson,
  type DemoRequest,
} from "@/lib/demo/types";
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
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: DemoRequest | null;
}) {
  const { persona, submitRequest, editRequest } = useDemo();
  const isEdit = !!editing;

  const [title, setTitle] = useState(editing?.title ?? "");
  const [offDutyStart, setOffDutyStart] = useState(() =>
    toLocalDatetimeInput(editing ? new Date(editing.offDutyStart) : new Date()),
  );
  const [backOnDuty, setBackOnDuty] = useState(() => {
    if (editing) return toLocalDatetimeInput(new Date(editing.backOnDuty));
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalDatetimeInput(d);
  });

  const preview = computeDuration(offDutyStart, backOnDuty);
  const valid = title.trim().length > 0 && backOnDuty > offDutyStart;
  const wasApproved = editing?.status === "approved";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    if (isEdit && editing) {
      editRequest(editing.id, { title: title.trim(), offDutyStart, backOnDuty });
      toast.success(
        wasApproved
          ? `Updated — sent back to ${DEMO_PEOPLE[otherPerson(persona)].name} for re-approval.`
          : "Request updated.",
      );
    } else {
      submitRequest({ title: title.trim(), offDutyStart, backOnDuty });
      toast.success(`Sent to ${DEMO_PEOPLE[otherPerson(persona)].name} for approval.`);
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
            {isEdit
              ? "Adjust the timing or name of this request."
              : "Like a car rental: when do you go off duty, and when are you back?"}
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
              {DEMO_PEOPLE[otherPerson(persona)].name}{" "}
              {isEdit ? "when re-approved" : "once approved"}.
            </p>
          )}
          {!valid && backOnDuty && backOnDuty <= offDutyStart && (
            <p className="text-destructive text-sm">
              &quot;Back on duty&quot; must be after &quot;Off duty starting&quot;.
            </p>
          )}
          {isEdit && wasApproved && (
            <p className="border-warning bg-warning/10 text-warning rounded-md border p-2 text-sm">
              This request is already approved. Saving sends it back to{" "}
              {DEMO_PEOPLE[otherPerson(persona)].name} for re-approval.
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={!valid}>
              {isEdit ? "Save changes" : "Submit for approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
