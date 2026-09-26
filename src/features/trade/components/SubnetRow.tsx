"use client";
import { Badge, Change, Checkbox, ImpactTag, Tag } from "@/components/ui";
import { useMoney } from "@/hooks/money";
import { useT } from "@/providers/ConfigProvider";
import { formatPct } from "@/services/format";
import { raoToTao } from "@/services/rao";
import type { Subnet } from "@/services/types";
import type { TradeModel } from "../useTradeModel";
import { CustomInput } from "./CustomInput";

/** Tick, badge, name + SN, job, Like tag, impact tag, TAO and share. Skipped rows show why. */
export function SubnetRow({ m, s }: { m: TradeModel; s: Subnet }) {
  const t = useT();
  const money = useMoney();
  const on = m.selected.includes(s.netuid);
  const leg = m.draft?.legs.find((l) => l.kind === "invest" && l.netuid === s.netuid);
  const skip = on ? m.draft?.skipped.find((x) => x.netuid === s.netuid) : undefined;
  const planned = m.plan.legs.find((l) => l.netuid === s.netuid)?.amount ?? 0n;
  const amount = leg?.amountIn ?? (skip ? 0n : planned);
  const share = m.amount > 0n ? raoToTao(amount) / raoToTao(m.amount) : 0;
  const toggle = () => m.st.set({ selected: on ? m.selected.filter((n) => n !== s.netuid) : [...m.selected, s.netuid] });
  return (
    <div role="checkbox" aria-checked={on} tabIndex={0} onClick={toggle} onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), toggle())}
      className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-[12px] px-2 py-2 hover:bg-s2 md:grid md:grid-cols-[22px_38px_1.4fr_1.4fr_1fr_1fr_60px_60px_110px] ${skip ? "opacity-60" : ""}`}>
      <Checkbox on={on} />
      <Badge netuid={s.netuid} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{s.name} <span className="text-muted">SN{s.netuid}</span></span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[12px] text-muted md:hidden">
          {s.job}
          {s.twin ? <Tag kind="like">{t("learn.like", { twin: s.twin })}</Tag> : null}
          {skip ? <Tag kind="pool">{t(`skip.${skip.reason}`)}</Tag> : leg ? <ImpactTag level={leg.impact} label={t(`impact.${leg.impact}`)} exact={formatPct(leg.slip, 2)} /> : null}
        </span>
      </span>
      <span className="hidden truncate text-[13px] text-muted md:block">{s.job}</span>
      <span className="hidden md:block">{s.twin ? <Tag kind="like">{s.twin}</Tag> : null}</span>
      <span className="hidden md:block">{skip ? <Tag kind="pool">{t(`skip.${skip.reason}`)}</Tag> : leg ? <ImpactTag level={leg.impact} label={t(`impact.${leg.impact}`)} exact={formatPct(leg.slip, 2)} /> : null}</span>
      <span className="hidden md:block">{s.live ? <Change pct={s.live.change7d} /> : null}</span>
      <span className="num hidden text-[12px] text-muted md:block">{on && !skip ? formatPct(share, 0) : ""}</span>
      <span className="text-right">
        {m.rule === "custom" && on && m.modes.invest ? (
          <CustomInput m={m} k={String(s.netuid)} />
        ) : (
          <>
            <span className="num block text-[14px] font-bold">{on && !skip ? money.pairRao(amount).primary : "—"}</span>
            <span className="num block text-[11.5px] text-muted md:hidden">{on && !skip ? formatPct(share, 0) : ""}</span>
          </>
        )}
      </span>
    </div>
  );
}
