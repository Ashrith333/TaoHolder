import "server-only";
import type { Source } from "@/adapters/content/schemas";
import { taoToRao } from "@/services/rao";
import type { HistoryLeg, HistoryTx, SubnetLive } from "@/services/types";
import { field, fillPath, getJson, rows, str } from "./http";
import type { ProviderFactory } from "./types";

// Taostats indexer. Paths and field names live in the source config so a changed API can be
// fixed from Supabase without a deploy. Defaults below are the T0 best guess — verify them.
const POOL_FIELDS = {
  netuid: "netuid",
  price: "price",
  taoReserve: "total_tao",
  alphaReserve: "alpha_in_pool",
  mcap: "market_cap",
  change7d: "price_change_1_week",
  change30d: "price_change_1_month",
  emission: "tao_emission_share",
  feeRate: "fee_rate",
};

type Fields = typeof POOL_FIELDS;
const fieldsOf = (src: Source): Fields => ({ ...POOL_FIELDS, ...(src.config.fields as Partial<Fields> | undefined) });
/** Cache seconds per call, overridable in config (e.g. {"cacheSec": {"pools": 3600}}). */
const ttl = (src: Source, key: string, d: number) => {
  const c = src.config.cacheSec as Record<string, unknown> | undefined;
  return typeof c?.[key] === "number" ? (c[key] as number) : d;
};
const reserveIsRao = (src: Source) => str(src.config.reserveUnit, "rao") === "rao";

function toRao(src: Source, v: number): bigint {
  return reserveIsRao(src) ? BigInt(Math.floor(v)) : taoToRao(v);
}

/** Optional: hotkeys with a validator permit per netuid (config.permitsPath). Unset → no permit check. */
async function permits(src: Source): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  if (typeof src.config.permitsPath !== "string") return out;
  const json = await getJson(src, src.config.permitsPath, ttl(src, "permits", 3600));
  const nf = str(src.config.permitNetuidField, "netuid");
  const hf = str(src.config.permitHotkeyField, "hotkey.ss58");
  for (const r of rows(json)) {
    const hk = hf.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), r);
    if (typeof hk !== "string") continue;
    const n = field(r, nf);
    out.set(n, [...(out.get(n) ?? []), hk]);
  }
  return out;
}

async function pools(src: Source): Promise<SubnetLive[]> {
  const f = fieldsOf(src);
  const [json, permitMap] = await Promise.all([
    getJson(src, str(src.config.poolsPath, "/dtao/pool/latest/v1?limit=256"), ttl(src, "pools", 60)),
    permits(src).catch(() => new Map<number, string[]>()),
  ]);
  return rows(json)
    .map((r): SubnetLive => {
      const taoReserve = toRao(src, field(r, f.taoReserve));
      const mcapRaw = field(r, f.mcap);
      return {
        netuid: field(r, f.netuid),
        priceTao: field(r, f.price),
        taoReserve,
        alphaReserve: toRao(src, field(r, f.alphaReserve)),
        weights: { tao: 0.5, alpha: 0.5 },
        feeRate: field(r, f.feeRate) || 0.0005,
        emissionShare: field(r, f.emission),
        emissionOn: taoReserve > 0n,
        mcapTao: reserveIsRao(src) ? mcapRaw / 1e9 : mcapRaw,
        change7d: field(r, f.change7d),
        change30d: field(r, f.change30d),
        permits: permitMap.get(field(r, f.netuid)),
      };
    })
    .filter((p) => p.netuid > 0);
}

async function series(src: Source, netuid: number) {
  const json = await getJson(src, fillPath(str(src.config.historyPath, "/dtao/pool/history/v1?netuid={netuid}&frequency=by_day&limit=30"), { netuid }), ttl(src, "series", 3600));
  return rows(json)
    .map((r) => ({ t: String((r as Record<string, unknown>).timestamp ?? ""), price: field(r, "price") }))
    .reverse();
}

async function positions(src: Source, coldkey: string) {
  const stake = await getJson(src, fillPath(str(src.config.stakePath, "/dtao/stake_balance/latest/v1?coldkey={coldkey}&limit=200"), { coldkey }), ttl(src, "positions", 30));
  const acct = await getJson(src, fillPath(str(src.config.accountPath, "/account/latest/v1?address={coldkey}"), { coldkey }), ttl(src, "positions", 30));
  const a = rows(acct)[0];
  const list = rows(stake).map((r) => {
    const hk = (r as { hotkey?: { ss58?: string } | string }).hotkey;
    return {
      netuid: field(r, "netuid"),
      hotkey: typeof hk === "string" ? hk : (hk?.ss58 ?? ""),
      alpha: BigInt(Math.floor(field(r, "balance"))),
      change7d: 0,
    };
  });
  const rootRows = list.filter((p) => p.netuid === 0);
  return {
    free: BigInt(Math.floor(field(a, "balance_free"))),
    root: rootRows.reduce((s, p) => s + p.alpha, 0n),
    rootHotkey: rootRows[0]?.hotkey,
    rootChange7d: 0,
    positions: list.filter((p) => p.netuid !== 0 && p.alpha > 0n),
    change7d: 0,
    asOf: new Date().toISOString(),
  };
}

const get = (obj: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
const ss58 = (v: unknown) => (typeof v === "string" ? v : typeof get(v, "ss58") === "string" ? (get(v, "ss58") as string) : "");

/** Field names for delegation/transfer rows; override in config.historyFields. */
const HISTORY_FIELDS = {
  action: "action", netuid: "netuid", tao: "amount", alpha: "alpha", hotkey: "hotkey",
  txId: "extrinsic_id", block: "block_number", time: "timestamp", from: "from", to: "to",
};

/** Stake/unstake events grouped per extrinsic (one batch = one card), plus transfers. */
async function history(src: Source, coldkey: string, page: number, limit: number) {
  const f = { ...HISTORY_FIELDS, ...(src.config.historyFields as Partial<typeof HISTORY_FIELDS> | undefined) };
  const vars = { coldkey, page: page + 1, limit };
  const [deleg, xfers] = await Promise.all([
    getJson(src, fillPath(str(src.config.path, "/delegation/v1?nominator={coldkey}&page={page}&limit={limit}"), vars), ttl(src, "history", 300)),
    typeof src.config.transfersPath === "string"
      ? getJson(src, fillPath(src.config.transfersPath, vars), ttl(src, "history", 300)).catch(() => null)
      : Promise.resolve(null),
  ]);
  const groups = new Map<string, HistoryTx>();
  for (const r of rows(deleg)) {
    const action = String(get(r, f.action) ?? "").toUpperCase();
    const removing = action.includes("UNDELEGATE") || action.includes("UNSTAKE") || action.includes("REMOVE");
    const rawNet = get(r, f.netuid);
    const netuid = rawNet === undefined || rawNet === null || rawNet === "" ? null : Number(rawNet);
    const leg: HistoryLeg = {
      type: netuid === 0 ? (removing ? "unstake" : "stake") : removing ? "sell" : "invest",
      netuid,
      tao: field(r, f.tao) / 1e9,
      tokens: netuid === 0 ? undefined : field(r, f.alpha) / 1e9 || undefined,
      hotkey: ss58(get(r, f.hotkey)) || undefined,
    };
    const block = field(r, f.block) || undefined;
    const id = String(get(r, f.txId) ?? `${block ?? "?"}-${groups.size}`);
    const g = groups.get(id) ?? { id, kind: "trade" as const, time: String(get(r, f.time) ?? ""), status: "done" as const, block, hash: id, legs: [] };
    g.legs.push(leg);
    groups.set(id, g);
  }
  const transfers: HistoryTx[] = rows(xfers).map((r, i) => {
    const from = ss58(get(r, f.from));
    const out = from === coldkey;
    const id = String(get(r, f.txId) ?? `t-${page}-${i}`);
    return {
      id, kind: "transfer", time: String(get(r, f.time) ?? ""), status: "done", block: field(r, f.block) || undefined, hash: id, legs: [],
      transfer: { direction: out ? "out" : "in", tao: field(r, f.tao) / 1e9, counterparty: out ? ss58(get(r, f.to)) : from },
    };
  });
  const items = [...groups.values(), ...transfers].sort((a, b) => b.time.localeCompare(a.time));
  const more = (j: unknown, n: number) => {
    const pag = (j as { pagination?: { next_page?: number | null } } | null)?.pagination;
    return pag ? pag.next_page != null : n === limit;
  };
  return { items, hasMore: more(deleg, rows(deleg).length) || (xfers ? more(xfers, rows(xfers).length) : false) };
}

export const taostats: ProviderFactory = {
  subnets: (src) => ({ pools: () => pools(src), series: (n) => series(src, n) }),
  pools: (src) => ({ pools: () => pools(src) }),
  positions: (src) => ({ positions: (c) => positions(src, c) }),
  history: (src) => ({ history: (c, p, l) => history(src, c, p, l) }),
  price: (src) => ({
    usd: async () => {
      const json = await getJson(src, str(src.config.pricePath, "/price/latest/v1?asset=tao"), ttl(src, "price", 300));
      return field(rows(json)[0], "price") || null;
    },
  }),
};
