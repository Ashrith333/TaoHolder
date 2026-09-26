"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchPools } from "@/hooks/data";
import { track } from "@/adapters/analytics";
import { useConfig } from "@/providers/ConfigProvider";
import { useTrade } from "@/stores/trade";
import { amountBucket } from "@/services/format";
import { raoToTao } from "@/services/rao";
import { makeAddQuote, makeSellQuote, newQuoteId } from "@/services/tradeQuote";
import type { TradeModel } from "./useTradeModel";
import type { useSellModel } from "./useSellModel";

// Continue → fresh /api/pools → quote → /trade/preview. No server holds trade intent.
export function useContinue() {
  const router = useRouter();
  const { guards, validators, app } = useConfig();
  const set = useTrade((s) => s.set);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(netuids: number[], make: (pools: Awaited<ReturnType<typeof fetchPools>>) => ReturnType<typeof makeAddQuote>) {
    setBusy(true);
    setError(null);
    try {
      const pools = await fetchPools(netuids);
      const quote = make(pools);
      set({ quote, prevQuote: null });
      quote.skipped.forEach((s) => track("guard_skipped", { reason: s.reason, netuid: s.netuid }));
      router.push("/trade/preview");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const env = (pools: Awaited<ReturnType<typeof fetchPools>>) => ({ pools, validators, cfg: guards, now: Date.now(), id: newQuoteId() });

  return {
    busy,
    error,
    add: (m: TradeModel) => {
      track("trade_continue", { mode: `${m.modes.stake ? "stake" : ""}${m.modes.invest ? "invest" : ""}`, rule: m.rule, filter: m.filter, legCount: m.ticked.length, amountBucket: amountBucket(raoToTao(m.amount), app.amountBuckets) });
      return run(m.ticked.map((s) => s.netuid), (pools) => makeAddQuote(env(pools), m.planInput));
    },
    sell: (m: ReturnType<typeof useSellModel>) =>
      run(m.chosen.filter((c) => c.netuid !== 0).map((c) => c.netuid), (pools) =>
        makeSellQuote(env(pools), m.chosen.map((c) => ({ netuid: c.netuid, hotkey: c.hotkey, amount: c.line.amount }))),
      ),
  };
}
