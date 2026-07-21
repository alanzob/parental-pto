"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "parental-pto-high-contrast";

export function HighContrastToggle() {
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Reading localStorage can't happen during SSR/first render without a
    // hydration mismatch, so this has to run post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(window.localStorage.getItem(STORAGE_KEY) === "1");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("high-contrast", enabled);
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  }, [enabled, hydrated]);

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={enabled}
      onClick={() => setEnabled((e) => !e)}
      title="Toggle high-contrast mode"
    >
      {enabled ? "High contrast: on" : "High contrast"}
    </Button>
  );
}
