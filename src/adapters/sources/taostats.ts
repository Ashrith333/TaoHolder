import "server-only";
import type { Source } from "@/adapters/content/schemas";
import { taoToRao } from "@/services/rao";
import type { SubnetLive } from "@/services/types";
import { buildHistory } from "./historyBuilder";
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

/**
 * History = signed extrinsics (incl. failures) + stake events + transfers, merged by
 * historyBuilder. Paths are editable per source (path / extrinsicsPath / transfersPath).
 */
async function history(src: Source, coldkey: string, page: number, limit: number, ss58Prefix: number) {
  const vars = { coldkey, page: page + 1, limit };
  const feed = (p: string) => getJson(src, fillPath(p, vars), ttl(src, "history", 60)).catch(() => null);
  const [ex, ev, tr] = await Promise.all([
    feed(str(src.config.extrinsicsPath, "/extrinsic/v1?signer_address={coldkey}&page={page}&limit={limit}")),
    feed(str(src.config.path, "/delegation/v1?nominator={coldkey}&page={page}&limit={limit}")),
    feed(str(src.config.transfersPath, "/transfer/v1?address={coldkey}&page={page}&limit={limit}")),
  ]);
  if (!ex && !ev && !tr) throw new Error(`${src.id}: all history feeds failed`);
  const items = buildHistory(
    { extrinsics: rows(ex) as Record<string, unknown>[], stakeEvents: rows(ev) as Record<string, unknown>[], transfers: rows(tr) as Record<string, unknown>[] },
    coldkey,
    ss58Prefix,
  );
  const more = (j: unknown) => (j as { pagination?: { next_page?: number | null } } | null)?.pagination?.next_page != null;
  return { items, hasMore: more(ex) || more(ev) || more(tr) };
}

export const taostats: ProviderFactory = {
  subnets: (src) => ({ pools: () => pools(src), series: (n) => series(src, n) }),
  pools: (src) => ({ pools: () => pools(src) }),
  positions: (src) => ({ positions: (c) => positions(src, c) }),
  history: (src) => ({ history: (c, p, l) => history(src, c, p, l, typeof src.config.ss58Prefix === "number" ? src.config.ss58Prefix : 42) }),
  price: (src) => ({
    usd: async () => {
      const json = await getJson(src, str(src.config.pricePath, "/price/latest/v1?asset=tao"), ttl(src, "price", 300));
      return field(rows(json)[0], "price") || null;
    },
  }),
};
