// Line-art social glyphs matching the app's blueprint aesthetic (currentColor
// strokes, same weight as lucide's default icon set) rather than solid brand
// marks — see components/how-it-works/step-icons.tsx for the same language.

function IconFrame({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "size-4"}
    >
      {children}
    </svg>
  );
}

export function XIcon({ className }: { className?: string }) {
  return (
    <IconFrame className={className}>
      <path
        d="M5 5l14 14M19 5 5 19"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <IconFrame className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M14 20v-6.6h2.2l.4-2.6H14v-1.7c0-.7.2-1.2 1.3-1.2H16.7V5.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 3.9v2H8.5v2.6h2V20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <IconFrame className={className}>
      <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16.8" cy="7.2" r="0.75" fill="currentColor" />
    </IconFrame>
  );
}
