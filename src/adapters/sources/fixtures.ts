import poolsJson from "@content/fixtures/pools.json";
import positionsJson from "@content/fixtures/positions.json";
import historyJson from "@content/fixtures/history.json";
import { taoToRao } from "@/services/rao";
import type { SubnetLive } from "@/services/types";
import type { ProviderFactory } from "./types";

// SAMPLE DATA provider for local/demo mode. Demo coldkeys tweak the shape:
// "demo-empty" → nothing held.
function pools(): SubnetLive[] {
  return poolsJson.pools.map(({ taoReserveTao, alphaReserve, ...p }) => ({
    ...p,
    taoReserve: taoToRao(taoReserveTao),
    alphaReserve: taoToRao(alphaReserve),
  }));
}

function series(netuid: number) {
  const p = poolsJson.pools.find((x) => x.netuid === netuid);
  if (!p) return [];
  const start = p.priceTao / (1 + p.change30d / 100);
  return Array.from({ length: 30 }, (_, i) => {
    const t = new Date(Date.UTC(2026, 7, 27 + i)).toISOString();
    const wobble = Math.sin(i * 1.3 + netuid) * 0.03 * p.priceTao;
    return { t, price: +(start + ((p.priceTao - start) * i) / 29 + (i === 29 ? 0 : wobble)).toFixed(5) };
  });
}

export const fixtures: ProviderFactory = {
  subnets: () => ({ pools: async () => pools(), series: async (n) => series(n) }),
  pools: () => ({ pools: async () => pools() }),
  positions: () => ({
    positions: async (coldkey) => {
      const empty = coldkey.startsWith("demo-empty");
      const r = positionsJson.root;
      return {
        free: empty ? 0n : taoToRao(positionsJson.freeTao),
        root: empty ? 0n : taoToRao(r.stakedTao),
        rootHotkey: r.hotkey,
        rootChange7d: r.change7d,
        positions: empty ? [] : positionsJson.positions.map((p) => ({ netuid: p.netuid, hotkey: r.hotkey, alpha: taoToRao(p.alpha), change7d: p.change7d })),
        change7d: empty ? 0 : positionsJson.change7d,
        asOf: new Date().toISOString(),
      };
    },
  }),
  history: () => ({
    history: async (coldkey, page, limit) => {
      const items = coldkey.startsWith("demo-empty") ? [] : (historyJson.items as never[]);
      return { items: items.slice(page * limit, (page + 1) * limit), hasMore: (page + 1) * limit < items.length };
    },
  }),
  price: (src) => ({ usd: async () => (typeof src.config.usd === "number" ? src.config.usd : null) }),
};
