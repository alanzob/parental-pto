"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CalendarFeedCallout({ feedToken }: { feedToken: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const feedUrl = `${origin}/api/feed/${feedToken}/feed.ics`;

  function copy() {
    navigator.clipboard.writeText(feedUrl);
    toast.success("Copied.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="label-tag">Our MyTO Calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-muted-foreground text-sm">
          Subscribe from Google Calendar (&quot;Other calendars → From
          URL&quot;) or Apple Calendar (&quot;File → New Calendar
          Subscription&quot;) to see approved requests alongside your own
          calendar.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={feedUrl} className="font-mono text-xs" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copy} className="flex-1 sm:flex-none">
              Copy
            </Button>
            <Link
              href="/dashboard/settings"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "flex-1 sm:flex-none",
              )}
            >
              Manage
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
