"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FundingOrder } from "@/services/funding/types";

// Funding orders started in this browser, so a refresh keeps tracking them.
type State = {
  orders: FundingOrder[];
  upsert: (o: FundingOrder) => void;
  patch: (id: string, p: Partial<FundingOrder>) => void;
};

export const useFunding = create<State>()(
  persist(
    (set) => ({
      orders: [],
      upsert: (o) => set((s) => ({ orders: [o, ...s.orders.filter((x) => x.id !== o.id)].slice(0, 50) })),
      patch: (id, p) =>
        set((s) => {
          const cur = s.orders.find((o) => o.id === id);
          if (!cur || Object.entries(p).every(([k, v]) => cur[k as keyof FundingOrder] === v)) return s; // no change → no re-render
          return { orders: s.orders.map((o) => (o.id === id ? { ...o, ...p } : o)) };
        }),
    }),
    { name: "th.funding" },
  ),
);
