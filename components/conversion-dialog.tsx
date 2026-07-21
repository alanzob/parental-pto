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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PTO_CATEGORIES, categoryLabel, type PtoCategory } from "@/lib/pto/categories";

export function ConversionDialog({
  open,
  onOpenChange,
  onSubmit,
  chudMode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { from: PtoCategory; to: PtoCategory; hours: number }) => Promise<boolean>;
  chudMode: boolean;
}) {
  // Remounted via `key` each time it opens (see dashboard-client.tsx), so
  // these initial values are fresh per open without needing an effect.
  const [from, setFrom] = useState<PtoCategory>(PTO_CATEGORIES[0]);
  const [to, setTo] = useState<PtoCategory>(PTO_CATEGORIES[1]);
  const [hours, setHours] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const sameCategory = from === to;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0 || sameCategory) return;
    setSubmitting(true);
    const ok = await onSubmit({ from, to, hours: h });
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Propose a conversion</DialogTitle>
          <DialogDescription>
            Your partner needs to approve this before the balances move.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Select value={from} onValueChange={(v) => setFrom(v as PtoCategory)}>
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
              <Label>To</Label>
              <Select value={to} onValueChange={(v) => setTo(v as PtoCategory)}>
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
          </div>
          {sameCategory && (
            <p className="text-destructive text-xs">
              Pick two different categories.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="conv-hours">Hours</Label>
            <Input
              id="conv-hours"
              type="number"
              min="0.5"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || sameCategory}>
              {submitting ? "Sending…" : "Send for approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
