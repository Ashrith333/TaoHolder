"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SplitRule } from "@/services/weights";
import type { CustomUnit, Modes } from "@/services/plan";
import type { Quote } from "@/services/types";

// Trade inputs (remembered) + the live quote (memory only; refresh returns to /trade).
type SellPick = { value: string; unit: "tao" | "pct" };
type State = {
  tab: "add" | "sell";
  amount: string;
  modes: Modes | null; // null → features.defaultModes on first visit
  stakePct: number | null;
  rule: SplitRule;
  filter: string | null;
  selected: number[] | null; // null → whole current filter
  customUnit: CustomUnit;
  custom: Record<string, string>;
  sell: Record<string, SellPick>; // key: netuid
  quote: Quote | null;
  prevQuote: Quote | null;
  set: (p: Partial<Omit<State, "set" | "reset">>) => void;
  reset: () => void;
};

const initial = {
  tab: "add" as const,
  amount: "",
  modes: null,
  stakePct: null,
  rule: "equal" as SplitRule,
  filter: null,
  selected: null,
  customUnit: "tao" as CustomUnit,
  custom: {},
  sell: {},
  quote: null,
  prevQuote: null,
};

export const useTrade = create<State>()(
  persist(
    (set) => ({
      ...initial,
      set: (p) => set(p),
      reset: () => set({ ...initial }),
    }),
    { name: "th.trade", partialize: (s) => ({ modes: s.modes, rule: s.rule, stakePct: s.stakePct, filter: s.filter }) },
  ),
);
