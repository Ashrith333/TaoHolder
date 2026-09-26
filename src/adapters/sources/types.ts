import type { Source } from "@/adapters/content/schemas";
import type { RawPositions } from "@/services/positions";
import type { HistoryItem, SubnetLive } from "@/services/types";
import type { SeriesPoint } from "./dto";

// Every input source implements one of these. Add a provider by writing a factory and
// registering it in registry.ts; pick it per network in data_sources (Supabase) or sources.json.
export interface PoolsProvider {
  pools(): Promise<SubnetLive[]>;
  series?(netuid: number): Promise<SeriesPoint[]>;
}
export interface PositionsProvider {
  positions(coldkey: string): Promise<RawPositions>;
}
export interface HistoryProvider {
  history(coldkey: string, page: number, limit: number): Promise<{ items: HistoryItem[]; hasMore: boolean }>;
}
export interface PriceProvider {
  usd(): Promise<number | null>;
}

export type ProviderKinds = {
  subnets: PoolsProvider;
  pools: PoolsProvider;
  positions: PositionsProvider;
  history: HistoryProvider;
  price: PriceProvider;
};
export type DataKind = keyof ProviderKinds;
export type ProviderFactory = { [K in DataKind]?: (src: Source) => ProviderKinds[K] };
