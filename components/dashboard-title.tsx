"use client";

import { useChudMode } from "@/components/chud-mode-provider";
import { AppLogo, APP_TITLE_CLASS } from "@/components/app-logo";

export function DashboardTitle() {
  const { registerClick } = useChudMode();

  return (
    <div className="flex items-center gap-3">
      <AppLogo onClick={registerClick} />
      <h1 className={APP_TITLE_CLASS}>Parental PTO</h1>
    </div>
  );
}
