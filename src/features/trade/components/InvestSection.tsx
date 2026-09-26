"use client";
import { Chip, ChipRow, Seg } from "@/components/ui";
import { useMoney } from "@/hooks/money";
import { useT } from "@/providers/ConfigProvider";
import { formatPct } from "@/services/format";
import { raoToTao } from "@/services/rao";
import type { SplitRule } from "@/services/weights";
import type { TradeModel } from "../useTradeModel";
import { SubnetRow } from "./SubnetRow";

/** Invest header, filter chips from buckets.json, split rule, subnet rows. */
export function InvestSection({ m }: { m: TradeModel }) {
  const t = useT();
  const money = useMoney();
  if (!m.modes.invest) return null;
  const { buckets } = m.cfg;
  const investShare = m.amount > 0n ? raoToTao(m.plan.invest) / raoToTao(m.amount) : 0;
  const chipLabel = (k: string) => (k === "bookmarks" ? t("trade.filter.bookmarks") : (buckets.buckets[k]?.label ?? k));
  return (
    <section className="card p-4">
      <h2 className="text-[17px] font-bold">{t("trade.investHeader", { pct: formatPct(investShare, 0), x: money.pairRao(m.plan.invest).primary })}</h2>
      <div className="mt-3">
        <ChipRow>
          {buckets.order.map((k) => (
            <Chip key={k} on={m.filter === k} onClick={() => m.st.set({ filter: k, selected: null })}>{chipLabel(k)}</Chip>
          ))}
        </ChipRow>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-muted">{t("trade.split")}</span>
        <Seg<SplitRule> label={t("trade.split")} value={m.rule} onChange={(rule) => m.st.set({ rule })} options={m.rules.map((r) => ({ value: r, label: t(`trade.split.${r}`) }))} />
        {m.rule === "custom" ? (
          <Seg label="Unit" value={m.st.customUnit} onChange={(customUnit) => m.st.set({ customUnit, custom: {} })} options={[{ value: "tao", label: t("trade.unit.tao") }, { value: "pct", label: t("trade.unit.pct") }]} />
        ) : null}
      </div>
      {m.rule === "emitted" ? <p className="mt-2 text-[12px] text-muted">{t("trade.split.emittedNote")}</p> : null}
      <div className="mt-3 hidden grid-cols-[22px_38px_1.4fr_1.4fr_1fr_1fr_60px_60px_110px] gap-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-dim md:grid">
        <span /><span /><span>{t("trade.table.subnet")}</span><span>{t("trade.table.job")}</span><span>{t("trade.table.like")}</span><span>{t("trade.table.impact")}</span><span>7d</span><span>{t("trade.table.share")}</span><span className="text-right">TAO</span>
      </div>
      <div className="mt-1 divide-y divide-line">
        {m.shown.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">{t("trade.noRows")}</p> : m.shown.map((s) => <SubnetRow key={s.netuid} m={m} s={s} />)}
      </div>
      <p className="mt-3 text-[12px] text-muted">{t("trade.split.help")}</p>
    </section>
  );
}
