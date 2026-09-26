import type { TxEvent } from "@/services/txMachine";
import type { DemoOutcome } from "./types";

// Simulated chain for demo mode: every result from the Figma prototype is reachable.
export function demoSubmit(outcome: DemoOutcome, failNetuid: number | undefined, onEvent: (e: TxEvent) => void): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const at = (ms: number, e: TxEvent) => timers.push(setTimeout(() => onEvent(e), ms));
  const hash = `0xdemo${Date.now().toString(16)}`;
  if (outcome === "reject") at(500, { t: "REJECT" });
  else {
    at(600, { t: "SUBMITTED", hash });
    if (outcome === "noBlock") at(1800, { t: "DROP" });
    else if (outcome === "priceMoved") at(1600, { t: "FAIL", reason: "SlippageTooHigh", priceLimit: true, netuid: failNetuid });
    else {
      at(1600, { t: "IN_BLOCK", block: 4_812_337 });
      at(3000, { t: "FINALIZED" });
    }
  }
  return () => timers.forEach(clearTimeout);
}
