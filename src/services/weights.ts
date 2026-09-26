import { sumRao } from "./rao";
import type { Rao, SubnetLive } from "./types";

// Split rules (PRD 12). Plain normalisation, no per-subnet cap (D2).
export type SplitRule = "equal" | "mcap" | "emitted" | "revenue" | "custom";

export type WeightRow = { netuid: number; live?: SubnetLive; revenueUsd?: number | null };

export function rawScore(rule: SplitRule, row: WeightRow): number {
  switch (rule) {
    case "equal":
      return 1;
    case "mcap":
      return Math.max(0, row.live?.mcapTao ?? 0);
    case "emitted":
      return Math.max(0, row.live?.emissionShare ?? 0);
    case "revenue":
      return Math.max(0, row.revenueUsd ?? 0);
    case "custom":
      return 0;
  }
}

/** Est. rev is offered only when the feature is on and enough rows have data. */
export function revenueRuleAvailable(
  rows: WeightRow[],
  features: { revenueSplitRule: boolean; revenueMinRows: number },
): boolean {
  if (!features.revenueSplitRule) return false;
  return rows.filter((r) => (r.revenueUsd ?? 0) > 0).length >= features.revenueMinRows;
}

export function weightsFor(rule: SplitRule, rows: WeightRow[]): number[] {
  if (rows.length === 0) return [];
  const scores = rows.map((r) => rawScore(rule, r));
  const total = scores.reduce((s, x) => s + x, 0);
  if (total <= 0) return rows.map(() => 1 / rows.length); // all zero → equal
  return scores.map((s) => s / total);
}

/** a_i = floor(B * w_i); rounding remainder goes to the largest leg. */
export function splitAmount(bucket: Rao, weights: number[]): Rao[] {
  if (weights.length === 0) return [];
  const SCALE = 1_000_000_000_000n;
  const scaled = weights.map((w) => BigInt(Math.floor(w * 1e12)));
  const total = scaled.reduce((s, x) => s + x, 0n);
  const amounts = scaled.map((s) => (total === 0n ? 0n : (bucket * s) / (total || SCALE)));
  let largest = 0;
  amounts.forEach((a, i) => {
    if (a > (amounts[largest] ?? 0n)) largest = i;
  });
  amounts[largest] = (amounts[largest] ?? 0n) + (bucket - sumRao(amounts));
  return amounts;
}

export function splitByRule(bucket: Rao, rule: SplitRule, rows: WeightRow[]): Rao[] {
  return splitAmount(bucket, weightsFor(rule, rows));
}
