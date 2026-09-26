"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Seg } from "@/components/ui";
import { useT } from "@/providers/ConfigProvider";
import { useTrade } from "@/stores/trade";
import { useTradeModel } from "../useTradeModel";
import { useContinue } from "../useContinue";
import { AmountInput } from "./AmountInput";
import { ModeCards } from "./ModeCards";
import { StakeRow } from "./StakeRow";
import { InvestSection } from "./InvestSection";
import { Summary } from "./Summary";
import { SellPanel } from "./SellPanel";

/** Trade: Stake & Invest | Sell (D11). Query: tab, stake, invest, mode, select, amount. */
export function TradeDesk() {
  const t = useT();
  const params = useSearchParams();
  const set = useTrade((s) => s.set);
  const tab = useTrade((s) => s.tab);
  useEffect(() => {
    const q = (k: string) => params.get(k);
    const patch: Parameters<typeof set>[0] = {};
    if (q("tab") === "sell" || q("tab") === "add") patch.tab = q("tab") as "add" | "sell";
    if (q("select")) patch.selected = q("select")!.split(",").map(Number).filter(Number.isInteger);
    if (q("mode") === "invest") patch.modes = { stake: false, invest: true };
    if (q("stake") || q("invest")) patch.modes = { stake: q("stake") === "1", invest: q("invest") === "1" || !q("stake") };
    if (q("amount")) patch.amount = q("amount")!.replace(/[^\d.]/g, "");
    if (Object.keys(patch).length) set(patch);
  }, [params, set]);
  return (
    <div>
      <div className="mb-4 max-w-[420px]">
        <Seg full label="Trade" value={tab} onChange={(v) => set({ tab: v })} options={[{ value: "add", label: t("trade.tab.add") }, { value: "sell", label: t("trade.tab.sell") }]} />
      </div>
      {tab === "add" ? <AddTab /> : <SellPanel />}
    </div>
  );
}

function AddTab() {
  const m = useTradeModel();
  const go = useContinue();
  return (
    <div className="md:grid md:grid-cols-[1fr_var(--summary-w)] md:gap-6">
      <div className="space-y-4 pb-56 md:pb-0">
        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          <AmountInput m={m} />
          <ModeCards m={m} />
        </div>
        <StakeRow m={m} />
        <InvestSection m={m} />
      </div>
      <aside className="fixed inset-x-0 bottom-[64px] z-30 border-t border-line bg-bg/95 p-4 backdrop-blur md:sticky md:top-20 md:bottom-auto md:self-start md:rounded-[16px] md:border md:bg-s1">
        <Summary m={m} busy={go.busy} error={go.error} onReview={() => go.add(m)} />
      </aside>
    </div>
  );
}
