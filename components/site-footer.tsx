import Link from "next/link";
import { CoffeeLink } from "@/components/coffee-link";
import { SocialLinks } from "@/components/social-links";

// Shared footer nav for the public/marketing-ish surfaces (auth, privacy,
// how-it-works, contact, demo) — not the authenticated dashboard, which
// already has its own task-focused nav and doesn't need a second one.
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
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
          <CoffeeLink />
        </div>
        <SocialLinks className="ml-auto" />
      </div>
    </footer>
  );
}
