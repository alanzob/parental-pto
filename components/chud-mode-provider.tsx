"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ChudModeContextValue = {
  enabled: boolean;
  registerClick: () => void;
};

const ChudModeContext = createContext<ChudModeContextValue | null>(null);

const CLICKS_REQUIRED = 5;
const CLICK_WINDOW_MS = 2500;

export function ChudModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const clickTimestamps = useRef<number[]>([]);

  const registerClick = useCallback(() => {
    const now = Date.now();
    clickTimestamps.current = [
      ...clickTimestamps.current.filter((t) => now - t < CLICK_WINDOW_MS),
      now,
    ];
    if (clickTimestamps.current.length >= CLICKS_REQUIRED) {
      clickTimestamps.current = [];
      setEnabled((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("chud-mode", enabled);
  }, [enabled]);

  return (
    <ChudModeContext.Provider value={{ enabled, registerClick }}>
      {children}
    </ChudModeContext.Provider>
  );
}

export function useChudMode() {
  const ctx = useContext(ChudModeContext);
  if (!ctx) throw new Error("useChudMode must be used within ChudModeProvider");
  return ctx;
}
