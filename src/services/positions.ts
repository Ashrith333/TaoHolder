import { alphaValue } from "./quote";
import { sumRao } from "./rao";
import type { Position, Positions, Rao, SubnetLive } from "./types";

// Account valuation (PRD 9.2): free + root + subnet positions at current pool price.
export type RawPositions = {
  free: Rao;
  root: Rao;
  rootHotkey?: string;
  rootChange7d: number;
  positions: { netuid: number; hotkey: string; alpha: Rao; change7d: number }[];
  change7d: number;
  asOf: string;
};

export function valuePositions(raw: RawPositions, pools: Map<number, SubnetLive>): Positions {
  const positions: Position[] = raw.positions
    .map((p) => {
      const pool = pools.get(p.netuid);
      return { ...p, valueTao: pool ? alphaValue(p.alpha, pool) : 0n };
    })
    .sort((a, b) => (b.valueTao > a.valueTao ? 1 : b.valueTao < a.valueTao ? -1 : 0));
  const totalTao = raw.free + raw.root + sumRao(positions.map((p) => p.valueTao));
  return { ...raw, positions, totalTao };
}

export type AllocationSegment = { key: string; value: Rao; share: number; shade: number };

/** Grey shades: root darkest, subnets by size, free lightest (F4). */
export function allocation(p: Positions): AllocationSegment[] {
  const total = p.totalTao === 0n ? 1n : p.totalTao;
  const share = (v: Rao) => Number((v * 10_000n) / total) / 10_000;
  const subnets = p.positions.map((x, i) => ({ key: `sn${x.netuid}`, value: x.valueTao, share: share(x.valueTao), shade: 2 + Math.min(i, 3) }));
  return [
    { key: "root", value: p.root, share: share(p.root), shade: 1 },
    ...subnets,
    { key: "free", value: p.free, share: share(p.free), shade: 6 },
  ].filter((s) => s.value > 0n);
}

export const isEmpty = (p: Positions) => p.totalTao === 0n;
