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
import { ResearchNotesWidget } from "@/components/pto/research-notes-widget";
import { AppLogo, APP_TITLE_CLASS } from "@/components/app-logo";
import { CoffeeLink } from "@/components/coffee-link";
import { HighContrastToggle } from "@/components/high-contrast-toggle";
import { Button, buttonVariants } from "@/components/ui/button";

function DemoShell() {
  const { reset, requests, persona, retroChudActive, registerLogoClick } = useDemo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nonce, setNonce] = useState(0);

  const pendingForMe = requests.filter(
    (r) => r.status === "pending" && r.creditedTo === persona,
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <AppLogo onClick={registerLogoClick} active={retroChudActive} />
            <div>
              <h1 className={APP_TITLE_CLASS}>Parental PTO — Demo</h1>
              <p className="text-muted-foreground text-xs">
                Local, no login required. Data lives in this browser only.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HighContrastToggle />
            <PersonaSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6">
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

        <ResearchNotesWidget />

        <StatsPanel />

        <div id="activity" className="scroll-mt-4">
          <h2 className="label-tag mb-2">Requests</h2>
          <RequestList />
        </div>

        <CalendarHeatmap />
      </main>

      <NewRequestDialog key={nonce} open={dialogOpen} onOpenChange={setDialogOpen} />

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-center px-4 py-3">
          <CoffeeLink />
        </div>
      </footer>
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
