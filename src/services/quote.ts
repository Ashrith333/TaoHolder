import { RAO, mulDiv, ppb } from "./rao";
import type { ImpactLevel, Rao, SubnetLive } from "./types";

// Per-leg pool maths (PRD 14.1). Weighted balancer pools; fee taken from input first.
export type ImpactCfg = { impactLowBelow: number; impactHighAbove: number; warnPoolShare: number };

export type LegQuote = {
  estOut: Rao; // alpha (buy) or rao (sell)
  estValueTao: Rao; // value received in TAO rao, at spot
  slip: number; // fee + price impact, 0..1
  poolShare: number; // leg size vs TAO reserve
  limitPrice: Rao; // rao per 1 alpha (1e9 units)
};

const BPS = 1_000_000_000n;

function swapOut(amountIn: Rao, rIn: Rao, rOut: Rao, wIn: number, wOut: number, feeRate: number): { x: Rao; out: Rao } {
  const x = mulDiv(amountIn, BPS - ppb(feeRate), BPS);
  if (rIn <= 0n || rOut <= 0n || x <= 0n) return { x, out: 0n };
  if (wIn === wOut) return { x, out: mulDiv(rOut, x, rIn + x) };
  // Unequal weights need a power; float is fine here, result is floored to bigint.
  const ratio = Number(rIn) / Number(rIn + x);
  const out = Number(rOut) * (1 - Math.pow(ratio, wIn / wOut));
  return { x, out: BigInt(Math.max(0, Math.floor(out))) };
}

function ratioOf(a: bigint, b: bigint): number {
  if (b === 0n) return 0;
  return Number(mulDiv(a, BPS, b)) / 1e9;
}

/** Invest: TAO in → subnet token out. */
export function quoteBuy(amountIn: Rao, pool: SubnetLive, limitTolerance: number): LegQuote {
  const { taoReserve: rIn, alphaReserve: rOut, weights, feeRate } = pool;
  const { x, out } = swapOut(amountIn, rIn, rOut, weights.tao, weights.alpha, feeRate);
  // spot TAO per alpha = (wAlpha * Rtao) / (wTao * Ralpha)
  const spotNum = BigInt(Math.round(weights.alpha * 1e6)) * rIn;
  const spotDen = BigInt(Math.round(weights.tao * 1e6)) * rOut;
  const estValueTao = spotDen === 0n ? 0n : mulDiv(out, spotNum, spotDen);
  const slip = amountIn === 0n ? 0 : 1 - ratioOf(estValueTao, amountIn);
  const postTao = rIn + x;
  const postAlpha = rOut - out;
  const post = postAlpha <= 0n ? 0n : mulDiv(postTao, RAO, postAlpha);
  const limitPrice = mulDiv(post, BPS + ppb(limitTolerance), BPS);
  return { estOut: out, estValueTao, slip, poolShare: ratioOf(amountIn, rIn), limitPrice };
}

/** Sell: subnet token in → TAO out. */
export function quoteSell(alphaIn: Rao, pool: SubnetLive, limitTolerance: number): LegQuote {
  const { taoReserve, alphaReserve, weights, feeRate } = pool;
  const { x, out } = swapOut(alphaIn, alphaReserve, taoReserve, weights.alpha, weights.tao, feeRate);
  const spotNum = BigInt(Math.round(weights.alpha * 1e6)) * taoReserve;
  const spotDen = BigInt(Math.round(weights.tao * 1e6)) * alphaReserve;
  const valueAtSpot = spotDen === 0n ? 0n : mulDiv(alphaIn, spotNum, spotDen);
  const slip = valueAtSpot === 0n ? 0 : 1 - ratioOf(out, valueAtSpot);
  const postAlpha = alphaReserve + x;
  const post = postAlpha <= 0n ? 0n : mulDiv(taoReserve - out, RAO, postAlpha);
  const limitPrice = mulDiv(post, BPS - ppb(limitTolerance), BPS);
  return { estOut: out, estValueTao: out, slip, poolShare: ratioOf(out, taoReserve), limitPrice };
}

/** Root is not a swap: 1:1, no fee. */
export function quoteRoot(amountIn: Rao): LegQuote {
  return { estOut: amountIn, estValueTao: amountIn, slip: 0, poolShare: 0, limitPrice: 0n };
}

/** Low / Medium / High in plain words (D14); pool share over the limit also means High (D10). */
export function impactLevel(slip: number, poolShare: number, cfg: ImpactCfg): ImpactLevel {
  if (slip > cfg.impactHighAbove || poolShare > cfg.warnPoolShare) return "high";
  if (slip >= cfg.impactLowBelow) return "medium";
  return "low";
}

/** Spot value of an alpha amount in TAO rao. */
export function alphaValue(alpha: Rao, pool: SubnetLive): Rao {
  if (pool.alphaReserve === 0n) return 0n;
  return mulDiv(alpha, pool.taoReserve, pool.alphaReserve);
}

/** Alpha amount worth `tao` at spot. */
export function taoToAlpha(tao: Rao, pool: SubnetLive): Rao {
  if (pool.taoReserve === 0n) return 0n;
  return mulDiv(tao, pool.alphaReserve, pool.taoReserve);
}
