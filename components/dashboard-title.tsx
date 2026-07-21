"use client";

import { useChudMode } from "@/components/chud-mode-provider";

export function DashboardTitle() {
  const { registerClick } = useChudMode();

  return (
    <h1
      className="cursor-default text-lg font-semibold select-none"
      onClick={registerClick}
    >
      Parental PTO
    </h1>
  );
}
