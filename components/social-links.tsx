import Link from "next/link";
import { Mail } from "lucide-react";
import { XIcon, FacebookIcon, InstagramIcon } from "@/components/icons/social-icons";

// Placeholders — no accounts exist yet. Swap these "#" hrefs for the real
// profile URLs once they're created; leaving them unset for now rather than
// guessing at handles that might belong to someone else.
const TWITTER_URL = "#";
const FACEBOOK_URL = "#";
const INSTAGRAM_URL = "#";

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`text-muted-foreground flex items-center gap-3 ${className}`}>
      <Link href="/contact" aria-label="Email" className="hover:text-foreground">
        <Mail className="size-4" aria-hidden="true" />
      </Link>
      <a
        href={TWITTER_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="MyTO on X"
        className="hover:text-foreground"
      >
        <XIcon className="size-4" />
      </a>
      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="MyTO on Facebook"
        className="hover:text-foreground"
      >
        <FacebookIcon className="size-4" />
      </a>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="MyTO on Instagram"
        className="hover:text-foreground"
      >
        <InstagramIcon className="size-4" />
      </a>
    </div>
  );
}
