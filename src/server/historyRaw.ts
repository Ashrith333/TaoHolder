import "server-only";
import { loadConfig } from "@/adapters/content/load";
import type { Source } from "@/adapters/content/schemas";

// Raw indexer responses for one address, so History mapping can be checked against real
// data. Public on-chain data only; uses the server's Taostats key; not cached. Each section
// tries a few known path variants and records every attempt (URL, HTTP status, body).
const ATTEMPTS: Record<string, string[]> = {
  account: ["/account/latest/v1?address={coldkey}"],
  stakeEvents: ["/delegation/v1?nominator={coldkey}&limit=50", "/delegation/v1?coldkey={coldkey}&limit=50", "/dtao/delegation/v1?nominator={coldkey}&limit=50"],
  stakeBalances: ["/dtao/stake_balance/latest/v1?coldkey={coldkey}&limit=50"],
  transfers: ["/transfer/v1?address={coldkey}&limit=50", "/transfer/v1?from={coldkey}&limit=50"],
  extrinsics: ["/extrinsic/v1?signer_address={coldkey}&limit=50", "/extrinsic/v1?address={coldkey}&limit=50"],
};

async function attempt(src: Source, path: string, coldkey: string) {
  const url = `${src.url ?? ""}${path.replace("{coldkey}", encodeURIComponent(coldkey))}`;
  const headers: Record<string, string> = { accept: "application/json" };
  const keyEnv = src.config.apiKeyEnv;
  if (typeof keyEnv === "string" && process.env[keyEnv]) headers.Authorization = process.env[keyEnv]!;
  try {
    const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const text = await res.text();
    let body: unknown = text.slice(0, 2000);
    try {
      body = JSON.parse(text);
    } catch {
      /* keep text */
    }
    return { url: url.replace(src.url ?? "", ""), status: res.status, body };
  } catch (e) {
    return { url: url.replace(src.url ?? "", ""), status: 0, body: String((e as Error).message) };
  }
}

export async function historyRaw(coldkey: string) {
  const cfg = await loadConfig();
  const src = cfg.sources.find((s) => s.provider === "taostats" && s.kind === "history") ?? cfg.sources.find((s) => s.provider === "taostats");
  const hasKey = typeof src?.config.apiKeyEnv === "string" && !!process.env[src.config.apiKeyEnv];
  const out: Record<string, unknown> = { network: cfg.network, coldkey, taostatsKeySet: hasKey, fetchedAt: new Date().toISOString() };
  if (!src) return { ...out, error: `No Taostats source enabled for network "${cfg.network}"` };
  await Promise.all(
    Object.entries(ATTEMPTS).map(async ([k, paths]) => {
      const tries = [];
      for (const p of paths) {
        const r = await attempt(src, p, coldkey);
        tries.push(r);
        if (r.status === 200) break; // first working variant is enough
      }
      out[k] = tries;
    }),
  );
  return out;
}
