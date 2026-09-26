import "server-only";
import { z } from "zod";
import * as S from "./schemas";
import { localDocs, localSubnets } from "./local";
import { loadRemote, type RemoteDocs } from "./remote";
import type { SubnetCurated, Network } from "@/services/types";

// One config bundle per request (cached 60 s). Each document: Supabase row if present and
// valid, else content/ JSON. Invalid remote data is logged and ignored, never shown.
export type ConfigBundle = {
  network: Network;
  app: S.AppConfig;
  features: S.Features;
  guards: S.Guards;
  buckets: S.Buckets;
  wallets: S.WalletsConfig;
  validators: S.Validators;
  sources: S.Source[];
  sections: S.Section[];
  copy: S.Copy;
  errors: S.Copy;
  subnets: SubnetCurated[];
  origin: Record<string, "supabase" | "local">;
};

const TTL_MS = 60_000;
let memo: { at: number; value: ConfigBundle } | null = null;

function pick<T>(name: string, schema: z.ZodType<T>, remote: unknown, local: unknown, origin: ConfigBundle["origin"]): T {
  if (remote !== undefined) {
    const r = schema.safeParse(remote);
    if (r.success) {
      origin[name] = "supabase";
      return r.data;
    }
    console.error(`[config] invalid supabase "${name}", using local`, r.error.issues.slice(0, 3));
  }
  origin[name] = "local";
  return schema.parse(local); // local must be valid; `pnpm content:check` enforces it in CI
}

export function buildBundle(remote: RemoteDocs | null): ConfigBundle {
  const c = remote?.configs ?? {};
  const origin: ConfigBundle["origin"] = {};
  const app = pick("app", S.appSchema, c.app, localDocs.app, origin);
  const envNet = process.env.NEXT_PUBLIC_CHAIN;
  const network: Network = envNet === "mainnet" || envNet === "testnet" || envNet === "local" ? envNet : app.network;
  const sources = pick("sources", z.array(S.sourceSchema), remote?.sources, localDocs.sources.sources, origin);
  const sections = pick("layout", z.array(S.sectionSchema), remote?.sections, localDocs.layout.sections, origin);
  const subnets = pick("subnets", z.array(S.subnetCuratedSchema), remote?.subnets, localSubnets(), origin);
  return {
    network,
    app,
    features: pick("features", S.featuresSchema, c.features, localDocs.features, origin),
    guards: pick("risk-guards", S.guardsSchema, c["risk-guards"], localDocs.guards, origin),
    buckets: pick("buckets", S.bucketsSchema, c.buckets, localDocs.buckets, origin),
    wallets: pick("wallets", S.walletsSchema, c.wallets, localDocs.wallets, origin),
    validators: pick("validators", S.validatorsSchema, remote?.validators, localDocs.validators, origin),
    copy: { ...localDocs.copy, ...pick("copy", S.copySchema, remote?.copy, localDocs.copy, origin) },
    errors: pick("errors", S.copySchema, c.errors, localDocs.errors, origin),
    sources: sources.filter((s) => s.network === network && s.enabled).sort((a, b) => a.priority - b.priority),
    sections: sections.filter((s) => s.enabled).sort((a, b) => a.position - b.position),
    subnets: subnets.sort((a, b) => a.netuid - b.netuid),
    origin,
  };
}

export async function loadConfig(): Promise<ConfigBundle> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.value;
  let remote: RemoteDocs | null = null;
  try {
    remote = await loadRemote();
  } catch (e) {
    console.error("[config] supabase unavailable, using content/ JSON", e);
  }
  const value = buildBundle(remote);
  memo = { at: Date.now(), value };
  return value;
}

/** What the browser needs. Server-only source config (API key env names, paths) is stripped. */
export type ClientConfig = Omit<ConfigBundle, "sources"> & { rpcWs: string | null; explorer: string | null };

export function toClientConfig(b: ConfigBundle): ClientConfig {
  const { sources, ...rest } = b;
  const first = (kind: string) => sources.find((s) => s.kind === kind)?.url ?? null;
  return { ...rest, rpcWs: first("rpc_ws") ?? process.env.NEXT_PUBLIC_RPC_WS_URL ?? null, explorer: first("explorer") };
}
