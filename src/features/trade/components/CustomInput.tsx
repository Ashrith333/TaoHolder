"use client";
import type { TradeModel } from "../useTradeModel";

/** Per-row input in Custom split (TAO or %). */
export function CustomInput({ m, k }: { m: TradeModel; k: string }) {
  const unit = m.st.customUnit;
  return (
    <label className="flex h-10 w-24 items-center rounded-[10px] border border-line bg-s2 px-2 focus-within:border-text" onClick={(e) => e.stopPropagation()}>
      <input
        inputMode="decimal"
        aria-label={`Amount for ${k}`}
        value={m.st.custom[k] ?? ""}
        placeholder="0"
        onChange={(e) => m.st.set({ custom: { ...m.st.custom, [k]: e.target.value.replace(/[^\d.]/g, "") } })}
        className="num w-full bg-transparent text-right text-[13px] font-bold outline-none"
      />
      <span className="ml-1 text-[11px] text-muted">{unit === "pct" ? "%" : "τ"}</span>
    </label>
  );
}
