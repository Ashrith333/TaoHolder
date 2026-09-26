"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HistoryItem } from "@/services/types";

// Local log of tx hashes submitted from this browser, so pending items show at once.
type Entry = HistoryItem & { owner: string };
type State = {
  entries: Entry[];
  add: (e: Entry) => void;
  update: (id: string, patch: Partial<Entry>) => void;
};

export const useTxLog = create<State>()(
  persist(
    (set) => ({
      entries: [],
      add: (e) => set((s) => ({ entries: [e, ...s.entries].slice(0, 200) })),
      update: (id, patch) => set((s) => ({ entries: s.entries.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    }),
    { name: "th.txlog" },
  ),
);
