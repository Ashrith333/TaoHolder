import { buildPlan, type PlanInput } from "./plan";
import { buildAddQuote, buildSellQuote, type QuoteCfg, type SellRow } from "./quoteBuilder";
import { splitByRule } from "./weights";
import type { ValidatorsDoc } from "./validators";
import type { Quote, SubnetLive } from "./types";

// Compose plan → quote. Used by Trade (Continue) and Preview (auto re-quote, S14).
export type QuoteEnv = { pools: Map<number, SubnetLive>; validators: ValidatorsDoc; cfg: QuoteCfg; now: number; id: string };

export function makeAddQuote(env: QuoteEnv, input: PlanInput): Quote {
  const plan = buildPlan(input);
  const reweight =
    input.rule === "custom"
      ? undefined
      : (netuids: number[]) => splitByRule(plan.invest, input.rule, input.rows.filter((r) => netuids.includes(r.netuid)));
  return buildAddQuote(env, plan.stake, plan.legs, reweight);
}

export function makeSellQuote(env: QuoteEnv, rows: SellRow[]): Quote {
  return buildSellQuote(env, rows);
}

/** Demo only: move one pool so a re-quote has something to show (Figma "prices moved"). */
export function shockPool(pools: Map<number, SubnetLive>, netuid: number, factor = 0.02): Map<number, SubnetLive> {
  const p = pools.get(netuid);
  if (!p) return pools;
  const next = new Map(pools);
  const f = BigInt(Math.round(factor * 1000));
  next.set(netuid, { ...p, taoReserve: (p.taoReserve * f) / 1000n, alphaReserve: (p.alphaReserve * f) / 1000n });
  return next;
}

export const newQuoteId = () => `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
