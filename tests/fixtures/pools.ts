import { taoToRao } from "@/services/rao";
import type { SubnetLive } from "@/services/types";

export function pool(netuid: number, taoReserve: number, price: number, extra: Partial<SubnetLive> = {}): SubnetLive {
  return {
    netuid,
    priceTao: price,
    taoReserve: taoToRao(taoReserve),
    alphaReserve: taoToRao(taoReserve / price),
    weights: { tao: 0.5, alpha: 0.5 },
    feeRate: 0.0005,
    emissionShare: 0.05,
    emissionOn: true,
    mcapTao: taoReserve * 2,
    change7d: 0,
    change30d: 0,
    ...extra,
  };
}

export const validators = {
  default: { name: "A", hotkey: "5A", maxTake: 0.18, take: 0.09 },
  perNetuid: { "4": { name: "B", hotkey: "5B", take: 0.1 } },
  fallback: { name: "C", hotkey: "5C", take: 0.1 },
};

export const cfg = {
  minPoolTao: 1000,
  minLegTao: 0.01,
  maxGuardPasses: 5,
  impactLowBelow: 0.005,
  impactHighAbove: 0.025,
  warnPoolShare: 0.02,
  limitTolerance: 0.005,
  quoteTtlSec: 45,
};
