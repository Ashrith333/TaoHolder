"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// The last main tab (Account / Trade / Learn) the user was on, so closing a panel
// (History, Settings, Legal) returns there. Kept for this browser tab only.
type State = { lastMain: string; setLastMain: (p: string) => void };

export const useNav = create<State>()(
  persist((set) => ({ lastMain: "/account", setLastMain: (lastMain) => set({ lastMain }) }), {
    name: "th.nav",
    storage: createJSONStorage(() => sessionStorage),
  }),
);
