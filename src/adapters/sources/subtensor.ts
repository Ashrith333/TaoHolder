import "server-only";
import type { Source } from "@/adapters/content/schemas";
import type { RawPositions } from "@/services/positions";
import type { SubnetLive } from "@/services/types";
import type { ProviderFactory } from "./types";

// Reads straight from the chain over the public Subtensor RPC: free, no API credits.
// Uses the runtime APIs SubnetInfoRuntimeApi.get_all_dynamic_info and
// StakeInfoRuntimeApi.get_stake_info_for_coldkey. If the node doesn't expose them, the call
// throws and the registry falls through to the next source (e.g. Taostats).
// The chain has no price history, so change7d / change30d are 0 here; data.ts fills them
// from a cached source named in config.changesFrom.

type Api = {
  call: Record<string, Record<string, (...a: unknown[]) => Promise<{ toJSON: () => unknown }>>>;
  query: { system: { account: (a: string) => Promise<{ data: { free: { toBigInt: () => bigint } } }> } };
  isConnected: boolean;
};

const CONNECT_MS = 15_000;
const apis = new Map<string, Promise<Api>>();

function connect(url: string): Promise<Api> {
  const hit = apis.get(url);
  if (hit) return hit;
  const p = import("@polkadot/api").then(async ({ ApiPromise, WsProvider }) => {
    const provider = new WsProvider(url, 2_500);
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`subtensor: no answer from ${url}`)), CONNECT_MS));
    try {
      return (await Promise.race([ApiPromise.create({ provider, noInitWarn: true }), timeout])) as unknown as Api;
    } catch (e) {
      provider.disconnect().catch(() => undefined);
      throw e;
    }
  });
  apis.set(url, p);
  p.catch(() => apis.delete(url));
  return p;
}

async function api(src: Source): Promise<Api> {
  if (!src.url) throw new Error(`${src.id}: url (wss://…) is required`);
  const a = await connect(src.url);
  if (!a.isConnected) {
    apis.delete(src.url);
    return connect(src.url);
  }
  return a;
}

function runtimeCall(a: Api, apiName: string, method: string) {
  const fn = a.call[apiName]?.[method];
  if (!fn) throw new Error(`subtensor: runtime API ${apiName}.${method} not available`);
  return fn;
}

/** u64/u128 from toJSON: number, decimal string or 0x hex string. */
const big = (v: unknown): bigint => {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(Math.floor(v));
  if (typeof v === "string" && v !== "") return BigInt(v);
  return 0n;
};
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

type DynamicInfo = { netuid: number; taoIn: unknown; alphaIn: unknown; alphaOut: unknown; taoInEmission: unknown };

async function pools(src: Source): Promise<SubnetLive[]> {
  const a = await api(src);
  const raw = (await runtimeCall(a, "subnetInfoRuntimeApi", "getAllDynamicInfo")()).toJSON();
  const list = (Array.isArray(raw) ? raw : []).filter((x): x is DynamicInfo => !!x && typeof x === "object" && "netuid" in x);
  if (!list.length) throw new Error("subtensor: empty dynamic info");
  const totalEmission = list.reduce((s, d) => s + big(d.taoInEmission), 0n) || 1n;
  const feeRate = num(src.config.feeRate, 0.0005);
  return list
    .filter((d) => d.netuid > 0)
    .map((d) => {
      const taoReserve = big(d.taoIn);
      const alphaReserve = big(d.alphaIn);
      const priceTao = alphaReserve > 0n ? Number(taoReserve) / Number(alphaReserve) : 0;
      return {
        netuid: d.netuid,
        priceTao,
        taoReserve,
        alphaReserve,
        weights: { tao: 0.5, alpha: 0.5 },
        feeRate,
        emissionShare: Number((big(d.taoInEmission) * 1_000_000n) / totalEmission) / 1_000_000,
        emissionOn: taoReserve > 0n,
        mcapTao: (priceTao * Number(alphaReserve + big(d.alphaOut))) / 1e9,
        change7d: 0,
        change30d: 0,
      };
    });
}

type StakeInfo = { hotkey: string; netuid: number; stake: unknown };

async function positions(src: Source, coldkey: string): Promise<RawPositions> {
  const a = await api(src);
  const [acct, stakesRaw] = await Promise.all([
    a.query.system.account(coldkey),
    runtimeCall(a, "stakeInfoRuntimeApi", "getStakeInfoForColdkey")(coldkey).then((r) => r.toJSON()),
  ]);
  const stakes = (Array.isArray(stakesRaw) ? stakesRaw : []) as StakeInfo[];
  const merged = new Map<string, { netuid: number; hotkey: string; alpha: bigint; change7d: number }>();
  for (const s of stakes) {
    const alpha = big(s.stake);
    if (alpha <= 0n) continue;
    const k = `${s.netuid}:${s.hotkey}`;
    const cur = merged.get(k);
    merged.set(k, { netuid: s.netuid, hotkey: s.hotkey, alpha: (cur?.alpha ?? 0n) + alpha, change7d: 0 });
  }
  const all = [...merged.values()];
  const root = all.filter((p) => p.netuid === 0);
  return {
    free: acct.data.free.toBigInt(),
    root: root.reduce((s, p) => s + p.alpha, 0n),
    rootHotkey: root[0]?.hotkey,
    rootChange7d: 0,
    positions: all.filter((p) => p.netuid !== 0),
    change7d: 0,
    asOf: new Date().toISOString(),
  };
}

export const subtensor: ProviderFactory = {
  subnets: (src) => ({ pools: () => pools(src) }),
  pools: (src) => ({ pools: () => pools(src) }),
  positions: (src) => ({ positions: (c) => positions(src, c) }),
};
