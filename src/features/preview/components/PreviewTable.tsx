"use client";
import { Badge, ImpactTag, Tag } from "@/components/ui";
import { useMoney } from "@/hooks/money";
import { useT } from "@/providers/ConfigProvider";
import { formatPct, formatTaoNumber, formatTokens } from "@/services/format";
import { raoToTao } from "@/services/rao";
import type { LegDiff } from "@/services/quoteDiff";
import type { Quote } from "@/services/types";

/** One row per leg, Stake first: Goes to, You put in, You get about, Price impact. */
export function PreviewTable({ quote, names, diff, flash }: { quote: Quote; names: Map<number, string>; diff: LegDiff[] | null; flash: Set<number> }) {
  const t = useT();
  const money = useMoney();
  const sell = quote.side === "sell";
  const name = (n: number) => (n === 0 ? t("account.root") : (names.get(n) ?? `SN${n}`));
  return (
    <div className="card overflow-hidden">
      <div className="hidden grid-cols-[1.6fr_1fr_1.2fr_1fr] gap-3 border-b border-line px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-dim md:grid">
        <span>{t("preview.goesTo")}</span><span>{t("preview.youPut")}</span><span>{t("preview.youGet")}</span><span>{t("preview.impact")}</span>
      </div>
      {quote.legs.map((l) => {
        const d = diff?.find((x) => x.netuid === l.netuid);
        const changed = d?.status === "changed";
        const putIn = sell && l.kind === "sell" ? `${formatTokens(raoToTao(l.amountIn))} tokens` : money.pairRao(l.amountIn).primary;
        return (
          <div key={`${l.kind}-${l.netuid}`} className={`grid grid-cols-2 gap-x-3 gap-y-1 border-b border-line px-4 py-3 last:border-0 md:grid-cols-[1.6fr_1fr_1.2fr_1fr] md:items-center ${changed ? "bg-red-soft" : ""} ${flash.has(l.netuid) ? "flash" : ""}`}>
            <div className="col-span-2 flex items-center gap-3 md:col-span-1">
              <Badge netuid={l.netuid} size={34} />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{name(l.netuid)}</p>
                <p className="truncate text-[11.5px] text-muted" title={l.hotkey}>{l.validatorName}{l.takePct ? ` · ${t("preview.take", { pct: formatPct(l.takePct, 0) })}` : ""}</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-dim md:hidden">{t("preview.youPut")}</p>
              <p className="num text-[14px] font-semibold">{putIn}</p>
            </div>
            <div>
              <p className="text-[11px] text-dim md:hidden">{t("preview.youGet")}</p>
              {changed && d?.was ? <p className="num text-[12px] text-muted line-through">{formatTaoNumber(raoToTao(d.was.out))} TAO</p> : null}
              <p className="num text-[14px] font-bold">
                {money.pairRao(l.estValueTao).primary}
                {changed && d?.direction ? <span className={d.direction === "up" ? "ml-1" : "ml-1 text-red"}>{d.direction === "up" ? "▲" : "▼"}</span> : null}
              </p>
              {l.kind === "invest" ? <p className="num text-[11.5px] text-muted">{t("preview.tokens", { x: formatTokens(raoToTao(l.estOut)) })}</p> : null}
            </div>
            <div className="col-span-2 flex items-center gap-2 md:col-span-1">
              {l.kind === "stakeRoot" || l.kind === "unstakeRoot" ? (
                <Tag>{t("impact.low")}</Tag>
              ) : (
                <>
                  <ImpactTag level={l.impact} label={t(`impact.${l.impact}`)} exact={formatPct(l.slip, 2)} />
                  {l.impact !== "low" ? <span className="num text-[11.5px] text-muted">{formatPct(l.slip, 2)}</span> : null}
                  {changed && d?.was ? <span className="num text-[11.5px] text-muted line-through">{formatPct(d.was.slip, 2)}</span> : null}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
