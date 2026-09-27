"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HistoryTx } from "@/services/types";

// Transactions sent from this browser. They show in History at once (before the indexer
// catches up) and keep failures the indexer never records. Nothing here leaves the device.
export type LogEntry = HistoryTx & { owner: string };
type State = {
  entries: LogEntry[];
  add: (e: LogEntry) => void;
  update: (id: string, patch: Partial<LogEntry>) => void;
};

export const useTxLog = create<State>()(
  persist(
    (set) => ({
      entries: [],
      add: (e) => set((s) => ({ entries: [e, ...s.entries.filter((x) => x.id !== e.id)].slice(0, 200) })),
      update: (id, patch) => set((s) => ({ entries: s.entries.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    }),
    // v2: per-leg detail. Older entries (label only, statuses not reliable) are dropped.
    { name: "th.txlog", version: 2, migrate: () => ({ entries: [] }) },
  ),
);
