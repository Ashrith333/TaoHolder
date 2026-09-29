import "server-only";
import { loadConfig } from "@/adapters/content/load";
import type { FundingAsset } from "@/services/funding/types";
import { changenow } from "./changenow";
import { demo } from "./demo";
import { forevermoney } from "./forevermoney";
import { FundingError, type FundingAdapter, type ProviderConfig } from "./types";

// Funding routes by id. New route (own contract, direct CCIP, another swap service):
// write a FundingAdapter, add it here, add an entry in funding.json / app_config.funding.
const FACTORIES: Record<string, (p: ProviderConfig) => FundingAdapter> = { demo, changenow, forevermoney };

export async function activeProviders(): Promise<FundingAdapter[]> {
  const cfg = await loadConfig();
  if (!cfg.funding.enabled) return [];
  return cfg.funding.providers
    .filter((p) => p.enabled && p.networks.includes(cfg.network) && FACTORIES[p.id])
    .map((p) => FACTORIES[p.id]!(p));
}

export async function assetById(id: string): Promise<FundingAsset> {
  const a = (await loadConfig()).funding.assets.find((x) => x.id === id);
  if (!a) throw new FundingError("unsupported", "Unknown token");
  return a;
}

/** The named provider, or the first enabled one that supports the asset. */
export async function providerFor(asset: FundingAsset, id?: string | null): Promise<FundingAdapter> {
  const list = await activeProviders();
  const p = id ? list.find((x) => x.id === id) : list.find((x) => x.supports(asset));
  if (!p || !p.supports(asset)) throw new FundingError("unsupported", `No route for ${asset.label} right now`);
  return p;
}
