"use client";
import { useT } from "@/providers/ConfigProvider";
import { raoToInput } from "@/services/rao";
import { useMoney } from "@/hooks/money";
import type { TradeModel } from "../useTradeModel";

/** Numeric TAO input, 4 decimals max, shortcuts 50% / Max (Max = free − fee buffer). */
export function AmountInput({ m }: { m: TradeModel }) {
  const t = useT();
  const money = useMoney();
  const set = m.st.set;
  const onChange = (v: string) => {
    const clean = v.replace(/,/g, ".").replace(/[^\d.]/g, "");
    const [w, f] = clean.split(".");
    set({ amount: f !== undefined ? `${w}.${f.slice(0, 4)}` : (w ?? "") });
  };
  const over = m.issue?.kind === "max";
  return (
    <div className="card p-4">
      <label htmlFor="amount" className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("trade.amount")}</label>
      <div className={`mt-2 flex items-center rounded-[14px] border bg-s2 px-4 ${over ? "border-red" : "border-line focus-within:border-text"}`}>
        <input
          id="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={m.st.amount}
          onChange={(e) => onChange(e.target.value)}
          className="num min-h-14 w-full bg-transparent text-[28px] font-extrabold outline-none placeholder:text-dim"
        />
        <span className="text-[15px] font-bold text-muted">TAO</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className={`num text-[12px] ${over ? "font-bold text-red" : "text-muted"}`}>
          {over ? t("trade.disabled.max", { x: raoToInput(m.max) }) : m.address ? t("trade.free", { x: money.pairRao(m.free).primary }) : ""}
        </span>
        <span className="flex gap-2">
          <button className="h-8 rounded-full border border-line px-3 text-[12px] font-bold" onClick={() => set({ amount: raoToInput(m.max / 2n) })}>{t("trade.half")}</button>
          <button className="h-8 rounded-full border border-line px-3 text-[12px] font-bold" onClick={() => set({ amount: raoToInput(m.max) })}>{t("trade.max")}</button>
        </span>
      </div>
    </div>
  );
}
