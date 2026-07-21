// TODO: replace YOUR_USERNAME_HERE with your real Buy Me a Coffee username.
const COFFEE_URL = "https://buymeacoffee.com/YOUR_USERNAME_HERE";

export function CoffeeLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={COFFEE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-muted-foreground hover:text-foreground text-xs ${className}`}
    >
      ☕ Buy me a coffee
    </a>
  );
}
