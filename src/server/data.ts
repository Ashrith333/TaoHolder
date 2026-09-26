import "server-only";
import { withSource } from "@/adapters/sources/registry";
import { poolToDto, positionsToDto, type HistoryPage } from "@/adapters/sources/dto";
import { loadConfig } from "@/adapters/content/load";
import { valuePositions } from "@/services/positions";

// Server data composition used by API routes and server components.
export async function getPools(netuids?: number[]) {
  const r = await withSource("pools", (p) => p.pools());
  const list = netuids && netuids.length ? r.value.filter((p) => netuids.includes(p.netuid)) : r.value;
  return { pools: list.map(poolToDto), source: r.source };
}

export async function getSubnets() {
  const cfg = await loadConfig();
  const [live, price] = await Promise.all([
    withSource("subnets", (p) => p.pools()).catch(() => null),
    getUsd(),
  ]);
  const byId = new Map((live?.value ?? []).map((p) => [p.netuid, poolToDto(p)]));
  const exclude = new Set(cfg.buckets.exclude);
  const subnets = cfg.subnets.filter((s) => !exclude.has(s.netuid)).map((s) => ({ ...s, live: byId.get(s.netuid) }));
  return { subnets, usd: price, source: live?.source ?? null };
}

export async function getSubnet(netuid: number) {
  const { subnets, usd } = await getSubnets();
  const subnet = subnets.find((s) => s.netuid === netuid);
  if (!subnet) return null;
  const series = await withSource("subnets", async (p) => (p.series ? p.series(netuid) : []))
    .then((r) => r.value)
    .catch(() => []);
  return { subnet, series30d: series, usd };
}

export async function getUsd(): Promise<number | null> {
  return withSource("price", (p) => p.usd())
    .then((r) => r.value)
    .catch(() => null);
}

export async function getPositions(coldkey: string) {
  const [raw, pools] = await Promise.all([
    withSource("positions", (p) => p.positions(coldkey)),
    withSource("pools", (p) => p.pools()),
  ]);
  const valued = valuePositions(raw.value, new Map(pools.value.map((p) => [p.netuid, p])));
  return { positions: positionsToDto(valued), source: raw.source };
}

export async function getHistory(coldkey: string, cursor: number): Promise<HistoryPage> {
  const cfg = await loadConfig();
  const limit = cfg.app.historyPageSize;
  try {
    const r = await withSource("history", (p) => p.history(coldkey, cursor, limit));
    return { items: r.value.items, next: r.value.hasMore ? String(cursor + 1) : null };
  } catch {
    return { items: [], next: null, localOnly: true };
  }
}
