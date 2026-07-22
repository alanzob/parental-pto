import { Coffee } from "lucide-react";

const COFFEE_URL = "https://buymeacoffee.com/alanzob";

export function CoffeeLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={COFFEE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs ${className}`}
    >
      <Coffee className="size-3.5" aria-hidden="true" />
      Buy me a coffee
    </a>
  );
}
