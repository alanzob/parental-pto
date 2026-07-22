"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { seedDemoRequests } from "@/lib/demo/seed";
import {
  durationToHours,
  normalizeDuration,
  otherPerson,
  type DemoPerson,
  type DemoRequest,
} from "@/lib/demo/types";
import { computeDuration } from "@/lib/demo/types";

// Bump this whenever lib/demo/seed.ts changes shape or story — otherwise
// anyone who already has v2 data cached in localStorage keeps seeing the
// old seed forever, since load() only falls back to seedDemoRequests()
// when the key is completely empty.
const STORAGE_KEY = "parental-pto-demo-v3";
const CLICKS_REQUIRED = 5;
const CLICK_WINDOW_MS = 2500;

type Balance = { fullDays: number; hours: number };

type DemoContextValue = {
  persona: DemoPerson;
  setPersona: (p: DemoPerson) => void;
  requests: DemoRequest[];
  balanceFor: (p: DemoPerson) => Balance;
  submitRequest: (input: { title: string; offDutyStart: string; backOnDuty: string }) => void;
  editRequest: (
    id: string,
    input: { title: string; offDutyStart: string; backOnDuty: string },
  ) => void;
  cancelRequest: (id: string) => void;
  approve: (id: string) => void;
  deny: (id: string) => void;
  reset: () => void;
  retroChudActive: boolean;
  registerLogoClick: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

function load(): DemoRequest[] {
  if (typeof window === "undefined") return seedDemoRequests();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDemoRequests();
    return JSON.parse(raw) as DemoRequest[];
  } catch {
    return seedDemoRequests();
  }
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [persona, setPersona] = useState<DemoPerson>("brian");
  const [requests, setRequests] = useState<DemoRequest[]>(() => seedDemoRequests());
  const [hydrated, setHydrated] = useState(false);
  const [retroChudActive, setRetroChudActive] = useState(false);
  const [chudBoosted, setChudBoosted] = useState<DemoPerson | null>(null);
  const clickTimestamps = useRef<number[]>([]);

  useEffect(() => {
    // Reading localStorage can't happen during SSR/first render without a
    // hydration mismatch (server has no window), so this genuinely needs
    // to run post-mount rather than as a lazy useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRequests(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }, [requests, hydrated]);

  useEffect(() => {
    document.documentElement.classList.toggle("retro-chud", retroChudActive);
  }, [retroChudActive]);

  const rawBalanceFor = useCallback(
    (p: DemoPerson) => {
      const totalHours = requests
        .filter((r) => r.status === "approved" && r.creditedTo === p)
        .reduce((sum, r) => sum + durationToHours(r.fullDays, r.hours), 0);
      return normalizeDuration(totalHours);
    },
    [requests],
  );

  const balanceFor = useCallback(
    (p: DemoPerson): Balance => {
      if (retroChudActive && chudBoosted) {
        if (p === chudBoosted) return { fullDays: 9999, hours: 0 };
        const raw = rawBalanceFor(p);
        const decimatedHours = Math.floor(durationToHours(raw.fullDays, raw.hours) * 0.1);
        return normalizeDuration(decimatedHours);
      }
      return rawBalanceFor(p);
    },
    [retroChudActive, chudBoosted, rawBalanceFor],
  );

  const submitRequest = useCallback(
    (input: { title: string; offDutyStart: string; backOnDuty: string }) => {
      const { fullDays, hours } = computeDuration(input.offDutyStart, input.backOnDuty);
      const newRequest: DemoRequest = {
        id: crypto.randomUUID(),
        title: input.title,
        requestedBy: persona,
        creditedTo: otherPerson(persona),
        offDutyStart: input.offDutyStart,
        backOnDuty: input.backOnDuty,
        fullDays,
        hours,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      setRequests((prev) => [newRequest, ...prev]);
    },
    [persona],
  );

  const editRequest = useCallback(
    (id: string, input: { title: string; offDutyStart: string; backOnDuty: string }) => {
      const { fullDays, hours } = computeDuration(input.offDutyStart, input.backOnDuty);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                title: input.title,
                offDutyStart: input.offDutyStart,
                backOnDuty: input.backOnDuty,
                fullDays,
                hours,
                // Re-approve on edit: an approved request drops back to
                // pending so the partner signs off on the new timing.
                status: r.status === "approved" ? ("pending" as const) : r.status,
              }
            : r,
        ),
      );
    },
    [],
  );

  const cancelRequest = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "cancelled" as const } : r)),
    );
  }, []);

  const approve = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" as const } : r)),
    );
  }, []);

  const deny = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "denied" as const } : r)),
    );
  }, []);

  const reset = useCallback(() => {
    setRequests(seedDemoRequests());
    setPersona("brian");
    setRetroChudActive(false);
    setChudBoosted(null);
  }, []);

  const registerLogoClick = useCallback(() => {
    const now = Date.now();
    clickTimestamps.current = [
      ...clickTimestamps.current.filter((t) => now - t < CLICK_WINDOW_MS),
      now,
    ];
    if (clickTimestamps.current.length >= CLICKS_REQUIRED) {
      clickTimestamps.current = [];
      setRetroChudActive((prevActive) => {
        const next = !prevActive;
        setChudBoosted(next ? persona : null);
        return next;
      });
    }
  }, [persona]);

  const value = useMemo(
    () => ({
      persona,
      setPersona,
      requests,
      balanceFor,
      submitRequest,
      editRequest,
      cancelRequest,
      approve,
      deny,
      reset,
      retroChudActive,
      registerLogoClick,
    }),
    [
      persona,
      requests,
      balanceFor,
      submitRequest,
      editRequest,
      cancelRequest,
      approve,
      deny,
      reset,
      retroChudActive,
      registerLogoClick,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}
