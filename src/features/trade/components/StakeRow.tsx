"use client";
import { Badge } from "@/components/ui";
import { useMoney } from "@/hooks/money";
import { useT } from "@/providers/ConfigProvider";
import { ROOT_KEY } from "@/services/plan";
import { resolveValidator } from "@/services/validators";
import type { TradeModel } from "../useTradeModel";
import { CustomInput } from "./CustomInput";

/** Stake row on top, with its own % (stepper) or a custom input. */
export function StakeRow({ m }: { m: TradeModel }) {
  const t = useT();
  const money = useMoney();
  if (!m.modes.stake) return null;
  const v = resolveValidator(0, m.cfg.validators);
  const both = m.modes.invest;
  const step = m.cfg.guards.stakeStepPct;
  const setPct = (p: number) => m.st.set({ stakePct: Math.max(0, Math.min(100, p)) });
  return (
    <div className="card flex items-center gap-3 p-3">
      <Badge netuid={0} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">{t("trade.stakeRow")}</p>
        <p className="truncate text-[12px] text-muted">{both ? v?.name : t("trade.stakeOnlyNote", { validator: v?.name ?? "—" })}</p>
      </div>
      {m.rule === "custom" ? (
        <CustomInput m={m} k={ROOT_KEY} />
      ) : both ? (
        <div className="flex items-center gap-1 rounded-full bg-s3 p-0.5" aria-label="Stake share">
          <button aria-label="Less" className="h-8 w-8 rounded-full font-bold" onClick={() => setPct(m.stakePct - step)}>−</button>
          <span className="num w-10 text-center text-[13px] font-bold">{m.stakePct}%</span>
          <button aria-label="More" className="h-8 w-8 rounded-full font-bold" onClick={() => setPct(m.stakePct + step)}>+</button>
        </div>
      ) : (
        <span className="rounded-full bg-s3 px-2.5 py-1 text-[12px] font-bold">100%</span>
      )}
      <span className="num w-24 text-right text-[14px] font-bold">{money.pairRao(m.plan.stake).primary}</span>
    </div>
  );
}
