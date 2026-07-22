import Link from "next/link";
import { AppLogo } from "@/components/app-logo";

// Editorial split used by the auth pages: a left "identity" panel carrying
// the serif wordmark, a mono spec annotation, the bar-mark, and ruler ticks
// with coordinate labels (the blueprint grid doing structural work), with
// the page's own content offset to the right instead of a lone centred card.
// Stacks to a compact top strip on mobile.

const RULER_TICKS = [0, 25, 50, 75, 100];

export function AuthShell({
  spec = ["Rev 1.0", "Two-parent household", "Shared time-off ledger"],
  children,
}: {
  spec?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="border-border relative flex flex-col justify-between border-b px-6 py-8 md:w-[42%] md:max-w-md md:border-r md:border-b-0 md:px-10 md:py-12">
        {/* Ruler ticks down the inner edge — drafting motif, desktop only. */}
        <div className="pointer-events-none absolute inset-y-12 right-0 hidden md:block" aria-hidden="true">
          {RULER_TICKS.map((n, i) => (
            <div
              key={n}
              className="absolute right-0 flex items-center gap-1.5"
              style={{ top: `${(i / (RULER_TICKS.length - 1)) * 100}%` }}
            >
              <span className="text-muted-foreground font-mono text-[10px] tabular-nums">{n}</span>
              <span className="bg-border block h-px w-2.5" />
            </div>
          ))}
        </div>

        <div className="flex items-end gap-3">
          <AppLogo />
        </div>

        <div className="py-8 md:py-0">
          <h1 className="font-heading text-4xl leading-[0.95] font-medium tracking-tight md:text-5xl">
            Parental
            <br />
            PTO
          </h1>
          <div className="text-muted-foreground mt-5 space-y-1">
            {spec.map((line) => (
              <p key={line} className="label-tag">
                {line}
              </p>
            ))}
          </div>
        </div>

        <p className="text-muted-foreground hidden font-mono text-[10px] tracking-wide md:block">
          $0/mo · Vercel + Supabase
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

// A slim, left-aligned footer row of utility links for the auth content
// column, replacing the old centred cluster under the card.
export function AuthFooterLinks({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      {children}
    </div>
  );
}

export function AuthFooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hover:text-foreground underline">
      {children}
    </Link>
  );
}
