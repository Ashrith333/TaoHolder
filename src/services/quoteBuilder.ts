import { impactLevel, quoteBuy, quoteRoot, quoteSell, type ImpactCfg } from "./quote";
import { runGuards, type GuardCfg } from "./guards";
import { resolveValidator, type ValidatorsDoc } from "./validators";
import type { Leg, Quote, Rao, Skip, SubnetLive } from "./types";

// Plan → guards → per-leg quote → Quote. Pure; fed with fresh /api/pools data.
export type QuoteCfg = GuardCfg & ImpactCfg & { limitTolerance: number; quoteTtlSec: number };

type Ctx = { pools: Map<number, SubnetLive>; validators: ValidatorsDoc; cfg: QuoteCfg; now: number; id: string };

function baseLeg(kind: Leg["kind"], netuid: number, v: { name: string; hotkey: string; take: number }) {
  return { kind, netuid, hotkey: v.hotkey, validatorName: v.name, takePct: v.take };
}

function finish(ctx: Ctx, side: Quote["side"], legs: Leg[], skipped: Skip[]): Quote {
  return {
    id: ctx.id,
    side,
    legs,
    skipped,
    feeEstimate: 0n, // filled by the chain adapter (paymentInfo) when available
    createdAt: ctx.now,
    expiresAt: ctx.now + ctx.cfg.quoteTtlSec * 1000,
  };
}

export function buildAddQuote(
  ctx: Ctx,
  stake: Rao,
  legs: { netuid: number; amount: Rao }[],
  reweight?: (netuids: number[]) => Rao[],
): Quote {
  const out: Leg[] = [];
  const skipped: Skip[] = [];
  if (stake > 0n) {
    const v = resolveValidator(0, ctx.validators);
    if (v) out.push({ ...baseLeg("stakeRoot", 0, v), amountIn: stake, ...quoteRoot(stake), impact: "low" });
    else skipped.push({ netuid: 0, reason: "noValidator" });
  }
  const { kept, skipped: s } = runGuards({
    rows: legs,
    pools: ctx.pools,
    hasValidator: (n) => resolveValidator(n, ctx.validators) !== null,
    cfg: ctx.cfg,
    reweight,
  });
  skipped.push(...s);
  const subnetLegs = kept
    .map((row) => {
      const pool = ctx.pools.get(row.netuid)!;
      const v = resolveValidator(row.netuid, ctx.validators)!;
      const q = quoteBuy(row.amount, pool, ctx.cfg.limitTolerance);
      return { ...baseLeg("invest", row.netuid, v), amountIn: row.amount, ...q, impact: impactLevel(q.slip, q.poolShare, ctx.cfg) };
    })
    .sort((a, b) => (b.amountIn > a.amountIn ? 1 : b.amountIn < a.amountIn ? -1 : 0));
  return finish(ctx, "add", [...out, ...subnetLegs], skipped);
}

export type SellRow = { netuid: number; hotkey: string; amount: Rao }; // alpha units, or rao for root

export function buildSellQuote(ctx: Ctx, rows: SellRow[]): Quote {
  const legs: Leg[] = [];
  const skipped: Skip[] = [];
  for (const r of rows) {
    if (r.amount <= 0n) continue;
    const v = { name: resolveValidator(r.netuid, ctx.validators)?.name ?? "Validator", hotkey: r.hotkey, take: 0 };
    if (r.netuid === 0) {
      legs.push({ ...baseLeg("unstakeRoot", 0, v), amountIn: r.amount, ...quoteRoot(r.amount), impact: "low" });
      continue;
    }
    const pool = ctx.pools.get(r.netuid);
    if (!pool) {
      skipped.push({ netuid: r.netuid, reason: "emissionOff" });
      continue;
    }
    const q = quoteSell(r.amount, pool, ctx.cfg.limitTolerance);
    legs.push({ ...baseLeg("sell", r.netuid, v), amountIn: r.amount, ...q, impact: impactLevel(q.slip, q.poolShare, ctx.cfg) });
  }
  legs.sort((a, b) => (a.netuid === 0 ? -1 : b.netuid === 0 ? 1 : b.estValueTao > a.estValueTao ? 1 : -1));
  return finish(ctx, "sell", legs, skipped);
}

/** Same legs, same amounts, fresh pools: for the 45 s timer and after a price-limit failure (S14). */
export function requote(ctx: Ctx, prev: Quote): Quote {
  const legs: Leg[] = [];
  const skipped: Skip[] = [...prev.skipped];
  for (const l of prev.legs) {
    if (l.kind === "stakeRoot" || l.kind === "unstakeRoot") {
      legs.push({ ...l });
      continue;
    }
    const pool = ctx.pools.get(l.netuid);
    if (!pool || (l.kind === "invest" && !pool.emissionOn)) {
      skipped.push({ netuid: l.netuid, reason: "emissionOff" });
      continue;
    }
    const q = l.kind === "invest" ? quoteBuy(l.amountIn, pool, ctx.cfg.limitTolerance) : quoteSell(l.amountIn, pool, ctx.cfg.limitTolerance);
    legs.push({ ...l, ...q, impact: impactLevel(q.slip, q.poolShare, ctx.cfg) });
  }
  return finish(ctx, prev.side, legs, skipped);
}

/** Drop one leg (S14 "Remove {subnet}"). */
export function removeLeg(q: Quote, netuid: number): Quote {
  return { ...q, legs: q.legs.filter((l) => l.netuid !== netuid) };
}
