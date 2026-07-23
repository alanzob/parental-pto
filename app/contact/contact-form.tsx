"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature idea" },
  { value: "general", label: "General feedback" },
];

export function ContactForm({ defaultEmail }: { defaultEmail: string }) {
  const [category, setCategory] = useState("general");
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, email: email || null, message: message.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Could not send that. Try again in a bit.");
      return;
    }
    setSent(true);
    setMessage("");
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm">
          <p className="font-medium">Sent — thank you.</p>
          <p className="text-muted-foreground mt-1">
            If you left an email, you might hear back directly.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setSent(false)}>
            Send another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>What&apos;s this about?</Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  aria-pressed={category === c.value}
                  className={cn(
                    "border-border rounded-sm border px-3 py-1.5 text-sm transition-colors",
                    category === c.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-message">Message</Label>
            <Textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened, or what you'd like to see"
              rows={5}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Email (optional)</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <p className="text-muted-foreground text-xs">
              Only if you&apos;d like a reply. Leave blank to stay anonymous.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={submitting || !message.trim()}>
            {submitting ? "Sending…" : "Send"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
