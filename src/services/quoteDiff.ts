import type { ImpactLevel, Quote, Rao } from "./types";

// Leg-by-leg diff after a price-limit failure (S14, D1).
export type DiffCfg = { diffSlipPts: number; diffOutPct: number };

export type LegDiff = {
  netuid: number;
  status: "changed" | "same" | "removed" | "added";
  was?: { slip: number; out: Rao; impact: ImpactLevel };
  now?: { slip: number; out: Rao; impact: ImpactLevel };
  direction?: "up" | "down"; // of "You get about"
};

function relChange(a: Rao, b: Rao): number {
  if (a === 0n) return b === 0n ? 0 : 1;
  const d = b > a ? b - a : a - b;
  return Number((d * 1_000_000n) / a) / 1_000_000;
}

export function diffQuotes(prev: Quote, next: Quote, cfg: DiffCfg): LegDiff[] {
  const key = (l: { kind: string; netuid: number }) => `${l.kind}:${l.netuid}`;
  const prevMap = new Map(prev.legs.map((l) => [key(l), l]));
  const out: LegDiff[] = [];
  for (const n of next.legs) {
    const p = prevMap.get(key(n));
    prevMap.delete(key(n));
    const now = { slip: n.slip, out: n.estValueTao, impact: n.impact };
    if (!p) {
      out.push({ netuid: n.netuid, status: "added", now });
      continue;
    }
    const was = { slip: p.slip, out: p.estValueTao, impact: p.impact };
    const changed =
      p.impact !== n.impact ||
      Math.abs(n.slip - p.slip) >= cfg.diffSlipPts - 1e-12 ||
      relChange(p.estValueTao, n.estValueTao) >= cfg.diffOutPct - 1e-12;
    const direction = n.estValueTao > p.estValueTao ? "up" : n.estValueTao < p.estValueTao ? "down" : undefined;
    out.push({ netuid: n.netuid, status: changed ? "changed" : "same", was, now, direction });
  }
  for (const p of prevMap.values()) {
    out.push({ netuid: p.netuid, status: "removed", was: { slip: p.slip, out: p.estValueTao, impact: p.impact } });
  }
  return out;
}
