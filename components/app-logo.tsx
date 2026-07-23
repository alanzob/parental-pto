export function AppLogo({
  onClick,
  active,
  className,
}: {
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="MyTO"
      className={`focus-visible:ring-ring shrink-0 select-none rounded-sm focus-visible:ring-2 focus-visible:outline-none ${className ?? ""}`}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={active ? "text-[#39ff14]" : "text-primary"}
      >
        <rect x="0.5" y="0.5" width="31" height="31" rx="2" stroke="currentColor" />
        <circle cx="15" cy="21" r="6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12.7" cy="20" r="0.8" fill="currentColor" />
        <circle cx="17.3" cy="20" r="0.8" fill="currentColor" />
        <path
          d="M12.3 23.2 Q15 25.4 17.7 23.2"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
        <line x1="15" y1="12" x2="15" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="14.5" x2="25" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="14.5" x2="7" y2="10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export const APP_TITLE_CLASS = "font-mono text-lg font-semibold tracking-wide uppercase";
