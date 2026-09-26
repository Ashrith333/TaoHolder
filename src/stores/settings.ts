"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Saved on this device (PRD 9.11). Works before connect.
export type Theme = "dark" | "light" | "auto";
type State = {
  showFirst: "tao" | "usd";
  theme: Theme | null; // null = use features.defaultTheme
  setShowFirst: (v: "tao" | "usd") => void;
  setTheme: (t: Theme) => void;
};

export const useSettings = create<State>()(
  persist(
    (set) => ({
      showFirst: "tao",
      theme: null,
      setShowFirst: (showFirst) => set({ showFirst }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "th.settings" },
  ),
);
