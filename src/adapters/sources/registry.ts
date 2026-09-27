import "server-only";
import { loadConfig } from "@/adapters/content/load";
import type { Source } from "@/adapters/content/schemas";
import { coingecko } from "./coingecko";
import { fixtures } from "./fixtures";
import { taostats } from "./taostats";
import { subtensor } from "./subtensor";
import type { DataKind, ProviderFactory, ProviderKinds } from "./types";

// Provider registry. To add a source: write a ProviderFactory, add it here, then add a
// data_sources row (Supabase) or a sources.json entry that names it.
const PROVIDERS: Record<string, ProviderFactory> = { fixtures, taostats, coingecko, subtensor };

export type SourceResult<T> = { value: T; source: string; stale?: boolean };

/**
 * Try every enabled source for this kind and network, in priority order, until one works.
 * A failing source falls through to the next (e.g. taostats → fixtures).
 */
export async function withSource<K extends DataKind, T>(
  kind: K,
  run: (provider: ProviderKinds[K], src: Source) => Promise<T>,
): Promise<SourceResult<T>> {
  const cfg = await loadConfig();
  const candidates = cfg.sources.filter((s) => s.kind === kind);
  const errors: string[] = [];
  for (const src of candidates) {
    const factory = PROVIDERS[src.provider]?.[kind];
    if (!factory) {
      errors.push(`${src.id}: no provider "${src.provider}" for ${kind}`);
      continue;
    }
    try {
      return { value: await run(factory(src) as ProviderKinds[K], src), source: src.id };
    } catch (e) {
      errors.push(`${src.id}: ${(e as Error).message}`);
    }
  }
  throw new Error(`No working source for "${kind}" on ${cfg.network}. ${errors.join(" | ")}`);
}

/** Run one named source directly (used for enrichment such as 7d change). */
export async function fromSource<K extends DataKind, T>(id: string, kind: K, run: (p: ProviderKinds[K]) => Promise<T>): Promise<T | null> {
  const src = (await loadConfig()).sources.find((s) => s.id === id);
  const factory = src ? PROVIDERS[src.provider]?.[kind] : undefined;
  if (!src || !factory) return null;
  return run(factory(src) as ProviderKinds[K]).catch(() => null);
}

export const providerNames = () => Object.keys(PROVIDERS);
