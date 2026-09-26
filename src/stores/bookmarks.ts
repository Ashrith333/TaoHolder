"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Stored locally, keyed by wallet address (or "guest").
type State = {
  byOwner: Record<string, number[]>;
  toggle: (owner: string, netuid: number) => void;
  clear: () => void;
};

export const useBookmarks = create<State>()(
  persist(
    (set) => ({
      byOwner: {},
      toggle: (owner, netuid) =>
        set((s) => {
          const cur = s.byOwner[owner] ?? [];
          const next = cur.includes(netuid) ? cur.filter((n) => n !== netuid) : [...cur, netuid];
          return { byOwner: { ...s.byOwner, [owner]: next } };
        }),
      clear: () => set({ byOwner: {} }),
    }),
    { name: "th.bookmarks" },
  ),
);

const EMPTY: number[] = [];
export const ownerKey = (address: string | null) => address ?? "guest";
export function useOwnerBookmarks(address: string | null): number[] {
  return useBookmarks((s) => s.byOwner[ownerKey(address)] ?? EMPTY);
}
