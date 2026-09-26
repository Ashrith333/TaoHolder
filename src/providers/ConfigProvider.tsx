"use client";
import { createContext, useContext, useMemo } from "react";
import type { ClientConfig } from "@/adapters/content/load";
import { fill } from "@/services/format";

// Config bundle from the server (Supabase or content/ JSON), available to every component.
const Ctx = createContext<ClientConfig | null>(null);

export function ConfigProvider({ value, children }: { value: ClientConfig; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConfig(): ClientConfig {
  const v = useContext(Ctx);
  if (!v) throw new Error("useConfig outside ConfigProvider");
  return v;
}

/** Copy lookup: every UI string lives in content/copy/en.json (or Supabase copy_strings). */
export function useT() {
  const { copy } = useConfig();
  return useMemo(() => (key: string, vars?: Record<string, string | number>) => fill(copy[key] ?? key, vars), [copy]);
}
