"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { seedDemoRequests } from "@/lib/demo/seed";
import { otherPerson, weightOfRequest, type DemoPerson, type DemoRequest } from "@/lib/demo/types";
import { categoryWindow, type OffCategory } from "@/lib/pto/categories";
import { tripWindow, type TripPeriod } from "@/lib/pto/trip";
import { occurrenceStarts, type Frequency } from "@/lib/pto/recurrence";

// Bump this whenever lib/demo/seed.ts changes shape or story, so cached
// localStorage data doesn't hide the new seed.
const STORAGE_KEY = "parental-pto-demo-v6";
const CLICKS_REQUIRED = 5;
const CLICK_WINDOW_MS = 2500;

type NewRequestInput = {
  title: string;
  date: string;
  category: OffCategory | "trip" | "custom";
  endDate?: string;
  departurePeriod?: TripPeriod;
  returnPeriod?: TripPeriod;
  customWeight?: number;
};

function windowCategory(input: NewRequestInput): OffCategory {
  return input.category === "custom" ? "day" : (input.category as OffCategory);
}

function requestWindow(input: NewRequestInput): { start: Date; end: Date } {
  if (input.category === "trip" && input.endDate && input.departurePeriod && input.returnPeriod) {
    return tripWindow(input.date, input.departurePeriod, input.endDate, input.returnPeriod);
  }
  return categoryWindow(input.date, windowCategory(input));
}

type DemoContextValue = {
  persona: DemoPerson;
  setPersona: (p: DemoPerson) => void;
  requests: DemoRequest[];
  /** Points banked to this person from approved requests credited to them. */
  balanceFor: (p: DemoPerson) => number;
  submitRequest: (input: NewRequestInput) => void;
  submitRecurringRequest: (input: NewRequestInput, frequency: Frequency, endsBy: string) => void;
  editRequest: (id: string, input: NewRequestInput) => void;
  cancelRequest: (id: string) => void;
  respondSeries: (seriesId: string, approve: boolean) => void;
  cancelSeries: (seriesId: string) => void;
  rescheduleSeries: (seriesId: string, days: number) => void;
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
    (p: DemoPerson) =>
      requests
        .filter((r) => r.status === "approved" && r.creditedTo === p)
        .reduce((sum, r) => sum + weightOfRequest(r), 0),
    [requests],
  );

  const balanceFor = useCallback(
    (p: DemoPerson): number => {
      if (retroChudActive && chudBoosted) {
        if (p === chudBoosted) return 9999;
        return Math.floor(rawBalanceFor(p) * 0.1);
      }
      return rawBalanceFor(p);
    },
    [retroChudActive, chudBoosted, rawBalanceFor],
  );

  const submitRequest = useCallback(
    (input: NewRequestInput) => {
      const { start, end } = requestWindow(input);
      const newRequest: DemoRequest = {
        id: crypto.randomUUID(),
        title: input.title,
        requestedBy: persona,
        creditedTo: otherPerson(persona),
        date: start.toISOString(),
        category: input.category,
        status: "pending",
        createdAt: new Date().toISOString(),
        ...(input.category === "trip"
          ? { endDate: end.toISOString(), departurePeriod: input.departurePeriod, returnPeriod: input.returnPeriod }
          : {}),
        ...(input.category === "custom" ? { customWeight: input.customWeight } : {}),
      };
      setRequests((prev) => [newRequest, ...prev]);
    },
    [persona],
  );

  const submitRecurringRequest = useCallback(
    (input: NewRequestInput, frequency: Frequency, endsBy: string) => {
      const seriesId = crypto.randomUUID();
      const creditedTo = otherPerson(persona);
      const firstStart = categoryWindow(input.date, windowCategory(input)).start;
      const starts = occurrenceStarts(firstStart, new Date(endsBy), frequency);
      const createdAt = new Date().toISOString();
      const instances: DemoRequest[] = starts.map((off) => ({
        id: crypto.randomUUID(),
        title: input.title,
        requestedBy: persona,
        creditedTo,
        date: off.toISOString(),
        category: input.category,
        status: "pending",
        seriesId,
        createdAt,
        ...(input.category === "custom" ? { customWeight: input.customWeight } : {}),
      }));
      setRequests((prev) => [...instances, ...prev]);
    },
    [persona],
  );

  const respondSeries = useCallback((seriesId: string, approve: boolean) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.seriesId === seriesId && r.status === "pending"
          ? { ...r, status: approve ? ("approved" as const) : ("denied" as const) }
          : r,
      ),
    );
  }, []);

  const cancelSeries = useCallback((seriesId: string) => {
    const now = Date.now();
    setRequests((prev) =>
      prev.map((r) =>
        r.seriesId === seriesId &&
        (r.status === "pending" || r.status === "approved") &&
        new Date(r.date).getTime() > now
          ? { ...r, status: "cancelled" as const }
          : r,
      ),
    );
  }, []);

  const rescheduleSeries = useCallback((seriesId: string, days: number) => {
    const now = Date.now();
    const shift = days * 24 * 60 * 60 * 1000;
    setRequests((prev) =>
      prev.map((r) =>
        r.seriesId === seriesId &&
        (r.status === "pending" || r.status === "approved") &&
        new Date(r.date).getTime() > now
          ? { ...r, date: new Date(new Date(r.date).getTime() + shift).toISOString() }
          : r,
      ),
    );
  }, []);

  const editRequest = useCallback((id: string, input: NewRequestInput) => {
    const { start, end } = requestWindow(input);
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        // Title-only edits don't touch dates/category/points/status — only
        // recompute + re-approve when something that affects the credit
        // actually changed.
        const contentChanged =
          r.category !== input.category ||
          r.date !== start.toISOString() ||
          r.endDate !== (input.category === "trip" ? end.toISOString() : undefined) ||
          r.departurePeriod !== input.departurePeriod ||
          r.returnPeriod !== input.returnPeriod ||
          r.customWeight !== (input.category === "custom" ? input.customWeight : undefined);
        return {
          ...r,
          title: input.title,
          date: start.toISOString(),
          category: input.category,
          endDate: input.category === "trip" ? end.toISOString() : undefined,
          departurePeriod: input.category === "trip" ? input.departurePeriod : undefined,
          returnPeriod: input.category === "trip" ? input.returnPeriod : undefined,
          customWeight: input.category === "custom" ? input.customWeight : undefined,
          status: contentChanged && r.status === "approved" ? ("pending" as const) : r.status,
        };
      }),
    );
  }, []);

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
      submitRecurringRequest,
      editRequest,
      cancelRequest,
      respondSeries,
      cancelSeries,
      rescheduleSeries,
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
      submitRecurringRequest,
      editRequest,
      cancelRequest,
      respondSeries,
      cancelSeries,
      rescheduleSeries,
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
