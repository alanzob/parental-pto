"use client";

import { useDemo } from "@/components/demo/demo-provider";

export function RetroLogo() {
  const { registerLogoClick, retroChudActive } = useDemo();

  return (
    <button
      type="button"
      onClick={registerLogoClick}
      aria-label="Parental PTO"
      className="focus-visible:ring-ring shrink-0 select-none rounded-sm focus-visible:ring-2 focus-visible:outline-none"
      title="No parenting data logo"
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={retroChudActive ? "text-[#39ff14]" : "text-primary"}
      >
        <rect x="0.5" y="0.5" width="31" height="31" rx="2" stroke="currentColor" />
        <line x1="5" y1="26" x2="27" y2="26" stroke="currentColor" strokeWidth="1" />
        <rect x="7" y="16" width="4" height="10" fill="currentColor" />
        <rect x="14" y="10" width="4" height="16" fill="currentColor" />
        <rect x="21" y="6" width="4" height="20" fill="currentColor" />
      </svg>
    </button>
  );
}
