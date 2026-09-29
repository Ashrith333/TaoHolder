import type { FundingOrderState } from "@/services/funding/types";
import { FundingError, type FundingAdapter, type ProviderConfig } from "./types";

// Simulated swap for local/testnet: SAMPLE rates, the order advances with time so the whole
// flow (deposit → converting → TAO arrived) can be clicked through and tested.
const USD: Record<string, number> = { ETH: 3500, USDC: 1, USDT: 1, SOL: 180, BTC: 95000 };
const TAO_USD = 287.5;
const STEPS: [number, FundingOrderState][] = [[0, "awaitingDeposit"], [2000, "confirming"], [4000, "converting"], [6000, "sending"], [8000, "done"]];

export function demo(p: ProviderConfig): FundingAdapter {
  const rate = (sym: string) => (USD[sym] ?? 0) / TAO_USD;
  return {
    id: p.id,
    supports: (a) => a.symbol in USD,
    async quote(asset, amountIn) {
      const taoOut = +(amountIn * rate(asset.symbol) * 0.99).toFixed(4);
      if (taoOut <= 0) throw new FundingError("unsupported", `${asset.symbol} is not supported`);
      return { provider: p.id, asset, amountIn, taoOut, feesNote: "SAMPLE: 1% demo fee included.", etaMinutes: 1 };
    },
    async create(asset, amountIn, toAddress) {
      const q = await this.quote(asset, amountIn);
      const id = `demo_${Date.now()}_${Math.round(q.taoOut * 1e4)}`;
      return {
        id, provider: p.id, asset, amountIn, taoExpected: q.taoOut, toAddress, state: "awaitingDeposit", createdAt: new Date().toISOString(),
        steps: [{ type: "send", to: "0xDEMO000000000000000000000000000000000000", amount: amountIn, asset }],
      };
    },
    async status(id, opts) {
      const [, , tao] = id.split("_");
      if (!opts?.sentAt) return { state: "awaitingDeposit" }; // waits for "Demo: I've sent it"
      const elapsed = Date.now() - opts.sentAt;
      const state = [...STEPS].reverse().find(([ms]) => elapsed >= ms)?.[1] ?? "awaitingDeposit";
      return { state, taoReceived: state === "done" ? Number(tao) / 1e4 : undefined, payoutHash: state === "done" ? "0xdemo" : undefined };
    },
  };
}
