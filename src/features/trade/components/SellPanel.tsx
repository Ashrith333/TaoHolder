"use client";
import { Badge, Button, Checkbox, Seg } from "@/components/ui";
import { useMoney } from "@/hooks/money";
import { useT } from "@/providers/ConfigProvider";
import { formatTaoNumber } from "@/services/format";
import { raoToTao } from "@/services/rao";
import { useSellModel } from "../useSellModel";
import { useContinue } from "../useContinue";

/** S10: multi-select positions, amount (TAO | % of position), Half / All, stays line. */
export function SellPanel() {
  const t = useT();
  const money = useMoney();
  const m = useSellModel();
  const go = useContinue();
  const set = (k: string, v: { value: string; unit: "tao" | "pct" } | undefined) => {
    const next = { ...m.st.sell };
    if (v) next[k] = v;
    else delete next[k];
    m.st.set({ sell: next });
  };
  if (m.positions.data && m.lines.length === 0) return <p className="card p-8 text-center text-muted">{t("sell.none")}</p>;
  const total = m.chosen.reduce((s, c) => s + c.line.sellTao, 0n);
  const out = m.draft?.legs.reduce((s, l) => s + l.estValueTao, 0n) ?? 0n;
  return (
    <div className="space-y-3 pb-40 md:pb-0">
      {m.lines.map((l) => {
        const k = String(l.netuid);
        const on = !!l.pick;
        const s = m.names.get(l.netuid);
        return (
          <div key={k} className="card p-3">
            <button role="checkbox" aria-checked={on} className="flex w-full items-center gap-3 text-left" onClick={() => set(k, on ? undefined : { value: "50", unit: "pct" })}>
              <Checkbox on={on} />
              <Badge netuid={l.netuid} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{l.netuid === 0 ? t("account.root") : (s?.name ?? `SN${l.netuid}`)}</span>
                <span className="block text-[12px] text-muted">{l.netuid === 0 ? t("sell.unstake") : `SN${l.netuid}`}</span>
              </span>
              <span className="num text-[14px] font-bold">{money.pairRao(l.valueTao).primary}</span>
            </button>
            {on && l.pick ? (
              <div className="mt-3 space-y-2 border-t border-line pt-3">
                <div className="flex items-center gap-2">
                  <input inputMode="decimal" aria-label="Amount" value={l.pick.value} onChange={(e) => set(k, { ...l.pick!, value: e.target.value.replace(/[^\d.]/g, "") })}
                    className="num h-11 w-full rounded-[12px] border border-line bg-s2 px-3 text-[15px] font-bold outline-none focus:border-text" />
                  <Seg label="Unit" value={l.pick.unit} onChange={(unit) => set(k, { value: "", unit })} options={[{ value: "tao", label: "TAO" }, { value: "pct", label: "%" }]} />
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className={l.line.dustSnapped ? "font-bold text-text" : "text-muted"}>
                    {l.line.dustSnapped ? t("sell.dust") : t("sell.stays", { x: formatTaoNumber(raoToTao(l.line.staysTao)), total: formatTaoNumber(raoToTao(l.valueTao)) })}
                  </span>
                  <span className="flex gap-2">
                    <button className="h-8 rounded-full border border-line px-3 font-bold" onClick={() => set(k, { value: "50", unit: "pct" })}>{t("sell.half")}</button>
                    <button className="h-8 rounded-full border border-line px-3 font-bold" onClick={() => set(k, { value: "100", unit: "pct" })}>{t("sell.all")}</button>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="fixed inset-x-0 bottom-[64px] z-30 border-t border-line bg-bg/95 p-4 backdrop-blur md:static md:rounded-[16px] md:border md:bg-s1">
        <p className="num mb-3 text-[14px] font-bold">
          {t("sell.summary", { x: money.pairRao(total).primary, n: m.chosen.length, y: money.pairRao(out).primary })}
        </p>
        <Button full disabled={!m.chosen.length} loading={go.busy} onClick={() => go.sell(m)}>{t("sell.cta")}</Button>
      </div>
    </div>
  );
}
