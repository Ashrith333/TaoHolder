import type { Leg } from "./types";

// Call descriptors (PRD 14). The chain adapter maps these onto api.tx; arg order is
// checked against runtime metadata there (T0). Kept pure so it is unit-testable.
export type Call = { pallet: "subtensorModule"; method: string; args: (string | number | bigint | boolean)[] };
export type Batch = { pallet: "utility"; method: "batchAll"; calls: Call[] };

export function legToCall(leg: Leg): Call {
  switch (leg.kind) {
    case "stakeRoot":
      return { pallet: "subtensorModule", method: "addStake", args: [leg.hotkey, 0, leg.amountIn] };
    case "invest":
      return {
        pallet: "subtensorModule",
        method: "addStakeLimit",
        args: [leg.hotkey, leg.netuid, leg.amountIn, leg.limitPrice, false],
      };
    case "sell":
      return {
        pallet: "subtensorModule",
        method: "removeStakeLimit",
        args: [leg.hotkey, leg.netuid, leg.amountIn, leg.limitPrice, false],
      };
    case "unstakeRoot":
      return { pallet: "subtensorModule", method: "removeStake", args: [leg.hotkey, 0, leg.amountIn] };
  }
}

/** Root first, then subnets by amount desc; all legs or none (D1). */
export function buildBatch(legs: Leg[]): Batch {
  const root = legs.filter((l) => l.netuid === 0);
  const rest = legs
    .filter((l) => l.netuid !== 0)
    .sort((a, b) => (b.amountIn > a.amountIn ? 1 : b.amountIn < a.amountIn ? -1 : 0));
  return { pallet: "utility", method: "batchAll", calls: [...root, ...rest].map(legToCall) };
}
