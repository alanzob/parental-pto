"use client";

import { useState } from "react";
import Link from "next/link";
import { DemoProvider, useDemo } from "@/components/demo/demo-provider";
import { PersonaSwitcher } from "@/components/demo/persona-switcher";
import { BalanceCards } from "@/components/demo/balance-cards";
import { RequestList } from "@/components/demo/request-list";
import { NewRequestDialog } from "@/components/demo/new-request-dialog";
import { StatsPanel } from "@/components/demo/stats-panel";
import { CalendarHeatmap } from "@/components/demo/calendar-heatmap";
import { RetroLogo } from "@/components/demo/retro-logo";
import { Button, buttonVariants } from "@/components/ui/button";

function DemoShell() {
  const { reset, requests, persona, retroChudActive } = useDemo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nonce, setNonce] = useState(0);

  const pendingForMe = requests.filter(
    (r) => r.status === "pending" && r.creditedTo === persona,
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <RetroLogo />
          <div>
            <h1 className="label-tag">Parental PTO — Demo</h1>
            <p className="text-muted-foreground text-xs">
              Local, no login required. Data lives in this browser only.
            </p>
          </div>
        </div>
        <PersonaSwitcher />
      </header>

      {retroChudActive && (
        <div className="border-2 border-current p-2 text-center font-mono text-xs tracking-widest uppercase">
          RETRO CHUD MODE ENGAGED — {persona.toUpperCase()} BANK: UNLIMITED
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setDialogOpen(true);
            setNonce((n) => n + 1);
          }}
        >
          Request time off
        </Button>
        <a href="#activity" className={buttonVariants({ variant: "outline" })}>
          View activity
        </a>
        <Button variant="outline" onClick={reset}>
          Reset demo data
        </Button>
        <Link href="/login" className="ml-auto self-center text-sm underline">
          Exit demo
        </Link>
      </div>

      {pendingForMe.length > 0 && (
        <div className="border-primary bg-accent border p-3 text-sm">
          {pendingForMe.length} request{pendingForMe.length > 1 ? "s" : ""}{" "}
          waiting on your approval below.
        </div>
      )}

      <BalanceCards />

      <StatsPanel />

      <div id="activity">
        <h2 className="label-tag mb-2">Requests</h2>
        <RequestList />
      </div>

      <CalendarHeatmap />

      <NewRequestDialog key={nonce} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

export default function DemoPage() {
  return (
    <DemoProvider>
      <DemoShell />
    </DemoProvider>
  );
}
