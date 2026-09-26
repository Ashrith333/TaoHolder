"use client";
import { Alert, Button } from "@/components/ui";
import { ConnectCta } from "@/features/wallet";
import { useMoney } from "@/hooks/money";
import { useT } from "@/providers/ConfigProvider";
import { formatTaoNumber } from "@/services/format";
import { raoToInput, raoToTao } from "@/services/rao";
import type { TradeModel } from "../useTradeModel";

/** One-line summary + Review. Sticky bar on phone, right-hand Summary card on laptop (D01). */
export function Summary({ m, onReview, busy, error }: { m: TradeModel; onReview: () => void; busy: boolean; error: string | null }) {
  const t = useT();
  const money = useMoney();
  const d = m.draft;
  const investLegs = d?.legs.filter((l) => l.kind === "invest") ?? [];
  const high = investLegs.filter((l) => l.impact === "high");
  const name = (n: number) => m.shown.find((s) => s.netuid === n)?.name ?? `SN${n}`;
  const stake = d?.legs.find((l) => l.kind === "stakeRoot")?.amountIn ?? 0n;
  const invest = investLegs.reduce((s, l) => s + l.amountIn, 0n);
  const total = money.pairRao(m.amount).primary;
  const line = !m.modes.invest
    ? t("trade.summaryStake", { total })
    : !m.modes.stake
      ? t("trade.summaryInvest", { total, n: investLegs.length })
      : t("trade.summary", { total, stake: formatTaoNumber(raoToTao(stake)), invest: formatTaoNumber(raoToTao(invest)), n: investLegs.length });
  const allSkipped = m.modes.invest && m.ticked.length > 0 && investLegs.length === 0 && (d?.skipped.length ?? 0) > 0;
  const disabled = !!m.issue || allSkipped || m.amount === 0n;
  const reason =
    m.issue?.kind === "place" ? t("trade.disabled.place", { x: raoToInput(m.issue.leftover) })
    : m.issue?.kind === "max" ? t("trade.disabled.max", { x: raoToInput(m.issue.max) })
    : m.issue?.kind === "select" ? t("trade.disabled.select")
    : m.amount === 0n ? t("trade.disabled.amount") : t("trade.review");
  const skipped = d?.skipped ?? [];
  return (
    <div className="space-y-3">
      <p className="num text-[14px] font-bold">{m.amount > 0n ? line : t("trade.disabled.amount")}</p>
      {skipped.length ? (
        <p className="text-[12px] text-muted">
          {t("trade.skipped", { n: m.ticked.length, m: skipped.length, reason: skipped.map((s) => `${t(`skip.${s.reason}`).toLowerCase()}: SN${s.netuid}`).join(", ") })}
        </p>
      ) : null}
      {m.issue?.kind === "place" ? <p className="text-[13px] font-bold text-red">{t("trade.notPlaced", { x: raoToInput(m.issue.leftover), total: raoToInput(m.amount) })}</p> : null}
      {high.map((l) => (
        <Alert key={l.netuid} kind="red">{t("impact.highNote", { subnet: name(l.netuid), x: formatTaoNumber(raoToTao(l.amountIn - l.estValueTao)) })}</Alert>
      ))}
      {allSkipped ? (
        <Alert kind="red" action={<button className="font-bold underline" onClick={() => m.st.set({ modes: { stake: true, invest: false } })}>{t("trade.sendAllToStake")}</button>}>{t("trade.allSkipped")}</Alert>
      ) : null}
      {m.modes.invest ? <p className="text-[12px] text-muted">{t("trade.risk")}</p> : null}
      {error ? <Alert kind="red">{error}</Alert> : null}
      {m.address ? (
        <Button full disabled={disabled} loading={busy} onClick={onReview}>{reason}</Button>
      ) : (
        <ConnectCta />
      )}
    </div>
  );
}
