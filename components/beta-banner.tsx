import Link from "next/link";

// Global open-beta notice. Sits above everything, including the
// dashboard — beta status is an app-wide fact, not scoped to marketing
// pages, unlike SiteFooter.
export function BetaBanner() {
  return (
    <div className="bg-accent text-accent-foreground border-border border-b px-4 py-1.5 text-center text-xs">
      Currently in Open Beta — built by a tired parent. We&apos;d love your feedback!{" "}
      <Link href="/contact" className="underline">
        Tell us what you think
      </Link>
      .
    </div>
  );
}
