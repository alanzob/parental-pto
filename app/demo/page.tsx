"use client";

import { useState } from "react";
import Link from "next/link";
import { DemoProvider, useDemo } from "@/components/demo/demo-provider";
import { PersonaSwitcher } from "@/components/demo/persona-switcher";
import { BalanceCards } from "@/components/demo/balance-cards";
import { RequestList } from "@/components/demo/request-list";
import { NewRequestDialog } from "@/components/demo/new-request-dialog";
import { StatsPanel } from "@/components/demo/stats-panel";
import { DisparityChart } from "@/components/demo/disparity-chart";
import { DemoSeriesControls } from "@/components/demo/series-controls";
import { CalendarHeatmap } from "@/components/demo/calendar-heatmap";
import { ResearchNotesWidget } from "@/components/pto/research-notes-widget";
import { AppLogo, APP_TITLE_CLASS } from "@/components/app-logo";
import { CoffeeLink } from "@/components/coffee-link";
import { SocialLinks } from "@/components/social-links";
import { HighContrastToggle } from "@/components/high-contrast-toggle";
import { MobileNav, MobileNavLink, MobileNavRow } from "@/components/ui/mobile-nav";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
              <h1 className={APP_TITLE_CLASS}>MyTO — Demo</h1>
              <p className="text-muted-foreground text-xs">
                Local, no login required. Data lives in this browser only.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <HighContrastToggle />
            </div>
            <PersonaSwitcher />
            <div className="sm:hidden">
              <MobileNav label="Menu">
                <MobileNavRow>
                  <HighContrastToggle />
                </MobileNavRow>
                <MobileNavLink href="/how-it-works">How it works</MobileNavLink>
                <MobileNavRow>
                  <Button variant="outline" onClick={reset} className="w-full">
                    Reset demo data
                  </Button>
                </MobileNavRow>
                <MobileNavLink href="/login" className="mt-2 border-t pt-3">
                  Exit demo
                </MobileNavLink>
              </MobileNav>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6">
        {retroChudActive && (
          <div className="border-2 border-current p-2 text-center font-mono text-xs tracking-widest uppercase">
            RETRO CHUD MODE ENGAGED — {persona.toUpperCase()} BANK: UNLIMITED
          </div>
        )}

        <div className="hidden flex-wrap gap-2 sm:flex">
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
          <Link href="/how-it-works" className="ml-auto self-center text-sm underline">
            How it works
          </Link>
          <Link href="/login" className="self-center text-sm underline">
            Exit demo
          </Link>
        </div>
        <div className="flex gap-2 sm:hidden">
          <Button
            className="flex-1"
            onClick={() => {
              setDialogOpen(true);
              setNonce((n) => n + 1);
            }}
          >
            Request time off
          </Button>
          <a
            href="#activity"
            className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
          >
            View activity
          </a>
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

        <DisparityChart />

        <DemoSeriesControls />

        <div id="activity" className="scroll-mt-4">
          <h2 className="label-tag mb-2">Requests</h2>
          <RequestList />
        </div>

        <CalendarHeatmap />
      </main>

      <NewRequestDialog key={nonce} open={dialogOpen} onOpenChange={setDialogOpen} />

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-3 px-4 py-3">
          <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-3 text-xs">
            <CoffeeLink />
            <Link href="/contact" className="hover:text-foreground underline">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-foreground underline">
              Privacy
            </Link>
            <Link href="/how-it-works" className="hover:text-foreground underline">
              How it works
            </Link>
            <Link href="/about" className="hover:text-foreground underline">
              About
            </Link>
          </div>
          <SocialLinks />
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
