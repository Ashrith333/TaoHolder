"use client";
import { Checkbox } from "@/components/ui";
import { useT } from "@/providers/ConfigProvider";
import { leftoverToStake } from "@/services/plan";
import { raoToInput } from "@/services/rao";
import type { TradeModel } from "../useTradeModel";

/** Two tick cards; at least one stays ticked (D11). */
export function ModeCards({ m }: { m: TradeModel }) {
  const t = useT();
  const toggle = (k: "stake" | "invest") => {
    const next = { ...m.modes, [k]: !m.modes[k] };
    if (!next.stake && !next.invest) return;
    const patch: Parameters<typeof m.st.set>[0] = { modes: next };
    // Ticking Stake while leftover exists moves it into the Stake row (PRD 9.4).
    if (k === "stake" && next.stake && m.rule === "custom" && m.plan.leftover > 0n) {
      const left = m.st.customUnit === "pct" ? String((Number(m.plan.leftover) / Number(m.amount || 1n)) * 100) : raoToInput(m.plan.leftover);
      patch.custom = leftoverToStake(m.st.custom, left, m.st.customUnit);
    }
    m.st.set(patch);
  };
  const card = (k: "stake" | "invest") => {
    const [title, body] = t(`trade.mode.${k}`).split(" · ");
    return (
      <button key={k} role="checkbox" aria-checked={m.modes[k]} onClick={() => toggle(k)}
        className={`card flex min-h-[72px] flex-1 items-start gap-3 p-4 text-left ${m.modes[k] ? "outline outline-2 outline-text" : ""}`}>
        <Checkbox on={m.modes[k]} />
        <span>
          <span className="block text-[15px] font-bold">{title}</span>
          <span className="block text-[12.5px] text-muted">{body}</span>
        </span>
      </button>
    );
  };
  return (
    <div>
      <p className="mb-2 text-[15px] font-bold">{t("trade.mode.question")}</p>
      <div className="flex gap-3">{card("stake")}{card("invest")}</div>
    </div>
  );
}
