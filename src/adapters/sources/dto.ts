import type { HistoryItem, Positions, SubnetLive } from "@/services/types";

// JSON-safe shapes for API responses: bigint rao travels as decimal strings.
export type SubnetLiveDto = Omit<SubnetLive, "taoReserve" | "alphaReserve"> & { taoReserve: string; alphaReserve: string };
export type PositionsDto = Omit<Positions, "free" | "root" | "totalTao" | "positions"> & {
  free: string;
  root: string;
  totalTao: string;
  positions: { netuid: number; hotkey: string; alpha: string; valueTao: string; change7d: number }[];
};
export type HistoryPage = { items: HistoryItem[]; next: string | null; localOnly?: boolean };
export type SeriesPoint = { t: string; price: number };

export const poolToDto = (p: SubnetLive): SubnetLiveDto => ({ ...p, taoReserve: p.taoReserve.toString(), alphaReserve: p.alphaReserve.toString() });
export const poolFromDto = (p: SubnetLiveDto): SubnetLive => ({ ...p, taoReserve: BigInt(p.taoReserve), alphaReserve: BigInt(p.alphaReserve) });

export const positionsToDto = (p: Positions): PositionsDto => ({
  ...p,
  free: p.free.toString(),
  root: p.root.toString(),
  totalTao: p.totalTao.toString(),
  positions: p.positions.map((x) => ({ ...x, alpha: x.alpha.toString(), valueTao: x.valueTao.toString() })),
});
export const positionsFromDto = (p: PositionsDto): Positions => ({
  ...p,
  free: BigInt(p.free),
  root: BigInt(p.root),
  totalTao: BigInt(p.totalTao),
  positions: p.positions.map((x) => ({ ...x, alpha: BigInt(x.alpha), valueTao: BigInt(x.valueTao) })),
});
