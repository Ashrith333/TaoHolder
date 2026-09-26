import "server-only";
import type { Source } from "@/adapters/content/schemas";
import { taoToRao } from "@/services/rao";
import type { HistoryItem, SubnetLive } from "@/services/types";
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
const reserveIsRao = (src: Source) => str(src.config.reserveUnit, "rao") === "rao";

function toRao(src: Source, v: number): bigint {
  return reserveIsRao(src) ? BigInt(Math.floor(v)) : taoToRao(v);
}

async function pools(src: Source): Promise<SubnetLive[]> {
  const f = fieldsOf(src);
  const json = await getJson(src, str(src.config.poolsPath, "/dtao/pool/latest/v1?limit=256"), 12);
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
      };
    })
    .filter((p) => p.netuid > 0);
}

async function series(src: Source, netuid: number) {
  const json = await getJson(src, fillPath(str(src.config.historyPath, "/dtao/pool/history/v1?netuid={netuid}&frequency=by_day&limit=30"), { netuid }), 600);
  return rows(json)
    .map((r) => ({ t: String((r as Record<string, unknown>).timestamp ?? ""), price: field(r, "price") }))
    .reverse();
}

async function positions(src: Source, coldkey: string) {
  const stake = await getJson(src, fillPath(str(src.config.stakePath, "/dtao/stake_balance/latest/v1?coldkey={coldkey}&limit=200"), { coldkey }), 10);
  const acct = await getJson(src, fillPath(str(src.config.accountPath, "/account/latest/v1?address={coldkey}"), { coldkey }), 10);
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

async function history(src: Source, coldkey: string, page: number, limit: number) {
  const json = await getJson(src, fillPath(str(src.config.path, "/delegation/v1?nominator={coldkey}&page={page}&limit={limit}"), { coldkey, page: page + 1, limit }), 30);
  const items: HistoryItem[] = rows(json).map((r, i) => {
    const o = r as Record<string, unknown>;
    const isAdd = String(o.action ?? "").toUpperCase().includes("DELEGATE") && !String(o.action).toUpperCase().includes("UN");
    const netuid = field(r, "netuid");
    const tao = field(r, "amount") / 1e9;
    return {
      id: String(o.extrinsic_id ?? o.id ?? `${page}-${i}`),
      action: isAdd ? (netuid === 0 ? "stake" : "invest") : "sell",
      label: isAdd ? (netuid === 0 ? "Stake TAO" : `Invest · SN${netuid}`) : `Sell · SN${netuid}`,
      legs: 1,
      time: String(o.timestamp ?? ""),
      taoIn: isAdd ? tao : 0,
      taoOut: isAdd ? 0 : tao,
      status: "done",
      hash: typeof o.extrinsic_id === "string" ? o.extrinsic_id : undefined,
    };
  });
  const pag = (json as { pagination?: { next_page?: number | null } }).pagination;
  return { items, hasMore: pag ? pag.next_page != null : items.length === limit };
}

export const taostats: ProviderFactory = {
  subnets: (src) => ({ pools: () => pools(src), series: (n) => series(src, n) }),
  pools: (src) => ({ pools: () => pools(src) }),
  positions: (src) => ({ positions: (c) => positions(src, c) }),
  history: (src) => ({ history: (c, p, l) => history(src, c, p, l) }),
  price: (src) => ({
    usd: async () => {
      const json = await getJson(src, str(src.config.pricePath, "/price/latest/v1?asset=tao"), 60);
      return field(rows(json)[0], "price") || null;
    },
  }),
};
