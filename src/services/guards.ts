import { taoToRao } from "./rao";
import type { Rao, Skip, SubnetLive } from "./types";

// Skip guards G1–G4 (PRD 13). High impact (G5/G6) is marked in quote, never skipped (D10).
export type GuardCfg = { minPoolTao: number; minLegTao: number; maxGuardPasses: number };

export type GuardRow = { netuid: number; amount: Rao };

export type GuardInput = {
  rows: GuardRow[];
  pools: Map<number, SubnetLive>;
  hasValidator: (netuid: number) => boolean;
  cfg: GuardCfg;
  /** Re-split the bucket over the kept netuids. Omit for Custom (amounts stay as typed). */
  reweight?: (netuids: number[]) => Rao[];
};

export type GuardResult = { kept: GuardRow[]; skipped: Skip[] };

function checkRow(row: GuardRow, input: GuardInput): Skip["reason"] | null {
  const pool = input.pools.get(row.netuid);
  if (!pool || !pool.emissionOn) return "emissionOff"; // G1
  if (pool.taoReserve < taoToRao(input.cfg.minPoolTao)) return "thinPool"; // G2
  if (!input.hasValidator(row.netuid)) return "noValidator"; // G3
  if (row.amount < taoToRao(input.cfg.minLegTao)) return "tooSmall"; // G4
  return null;
}

export function runGuards(input: GuardInput): GuardResult {
  let rows = input.rows;
  const skipped: Skip[] = [];
  for (let pass = 0; pass < input.cfg.maxGuardPasses; pass++) {
    const passSkips: Skip[] = [];
    const kept = rows.filter((r) => {
      const reason = checkRow(r, input);
      if (reason) passSkips.push({ netuid: r.netuid, reason });
      return !reason;
    });
    skipped.push(...passSkips);
    if (passSkips.length === 0 || kept.length === 0 || !input.reweight) {
      return { kept, skipped };
    }
    const amounts = input.reweight(kept.map((r) => r.netuid));
    rows = kept.map((r, i) => ({ netuid: r.netuid, amount: amounts[i] ?? 0n }));
  }
  return { kept: rows, skipped };
}

/** G7: amount must fit free balance minus the fee buffer. */
export function maxSpendable(free: Rao, feeBufferTao: number): Rao {
  const m = free - taoToRao(feeBufferTao);
  return m > 0n ? m : 0n;
}
