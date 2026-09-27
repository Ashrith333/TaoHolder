import "server-only";
import { loadConfig } from "@/adapters/content/load";
import { fillPath, getJson } from "@/adapters/sources/http";

// Raw indexer responses for one address, so History mapping can be checked against real
// data. Public on-chain data only; uses the server's Taostats key. No caching.
const PATHS = {
  stakeEvents: "/delegation/v1?nominator={coldkey}&limit=50",
  transfers: "/transfer/v1?address={coldkey}&limit=50",
  extrinsics: "/extrinsic/v1?signer_address={coldkey}&limit=50",
};

export async function historyRaw(coldkey: string) {
  const cfg = await loadConfig();
  const src = cfg.sources.find((s) => s.provider === "taostats" && s.kind === "history");
  if (!src) return { error: `No Taostats history source for network ${cfg.network}` };
  const out: Record<string, unknown> = { network: cfg.network, coldkey, fetchedAt: new Date().toISOString() };
  await Promise.all(
    Object.entries(PATHS).map(async ([k, p]) => {
      out[k] = await getJson(src, fillPath(p, { coldkey }), 0).catch((e: Error) => ({ error: e.message }));
    }),
  );
  return out;
}
