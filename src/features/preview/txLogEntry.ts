import type { LogEntry } from "@/stores/txLog";
import { raoToTao } from "@/services/rao";
import type { HistoryLeg, Leg, Quote } from "@/services/types";

const LEG_TYPE: Record<Leg["kind"], HistoryLeg["type"]> = { stakeRoot: "stake", invest: "invest", sell: "sell", unstakeRoot: "unstake" };

/** A quote as a History entry: one leg per subnet with our estimated amounts. */
export function logEntryFor(quote: Quote, owner: string, id: string): LogEntry {
  return {
    id,
    owner,
    kind: "trade",
    time: new Date().toISOString(),
    status: "pending",
    legs: quote.legs.map((l) => ({
      type: LEG_TYPE[l.kind],
      netuid: l.netuid,
      tao: raoToTao(l.kind === "sell" ? l.estValueTao : l.amountIn),
      tokens: l.kind === "invest" ? raoToTao(l.estOut) : l.kind === "sell" ? raoToTao(l.amountIn) : undefined,
      hotkey: l.hotkey,
      estimate: true,
    })),
  };
}
