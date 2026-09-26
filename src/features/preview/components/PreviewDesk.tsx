"use client";
import Link from "next/link";
import { Alert, Button, Chip, ChipRow, Skeleton } from "@/components/ui";
import { useSubnets } from "@/hooks/data";
import { useMoney } from "@/hooks/money";
import { useT } from "@/providers/ConfigProvider";
import { formatTaoNumber } from "@/services/format";
import { raoToTao } from "@/services/rao";
import { usePreviewFlow } from "../usePreviewFlow";
import { PreviewTable } from "./PreviewTable";
import { QuoteTimer } from "./QuoteTimer";
import { TxStatus } from "./TxStatus";

/** Review (S08) + transaction states (S09) + price moved re-quote (S14). */
export function PreviewDesk() {
  const t = useT();
  const f = usePreviewFlow();
  const money = useMoney();
  const subnets = useSubnets();
  const names = new Map((subnets.data?.subnets ?? []).map((s) => [s.netuid, s.name]));
  const q = f.quote;
  if (!q) {
    return (
      <div className="card p-8 text-center">
        <p className="text-muted">{t("preview.empty")}</p>
        <Link href="/trade" className="mt-4 inline-flex min-h-12 items-center rounded-[14px] bg-primary px-5 font-bold text-on-primary">{t("preview.back")}</Link>
      </div>
    );
  }
  const s = f.tx.s;
  const busy = s === "quoting";
  const editable = s === "previewReady" || s === "requoteReady" || s === "rejectedByUser" || s === "dropped";
  const changed = f.diff?.filter((d) => d.status === "changed") ?? [];
  const skippedNote = q.skipped.length
    ? t("trade.skipped", { n: q.legs.length + q.skipped.length, m: q.skipped.length, reason: q.skipped.map((x) => `${t(`skip.${x.reason}`).toLowerCase()}: SN${x.netuid}`).join(", ") })
    : null;
  const total = q.legs.reduce((a, l) => a + (q.side === "sell" ? l.estValueTao : l.amountIn), 0n);
  const confirmLabel = s === "requoteReady" ? t("requote.cta") : s === "rejectedByUser" ? t("tx.confirmAgain") : s === "dropped" ? t("tx.retry") : t("preview.confirm");
  return (
    <div className="mx-auto max-w-[880px] space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold">{q.side === "sell" ? t("preview.saleTitle") : t("preview.title")}</h1>
        {editable ? <QuoteTimer key={q.id} expiresAt={q.expiresAt} onExpire={f.expire} paused={!editable} /> : null}
      </div>
      {s === "requoteReady" ? (
        <Alert kind="red">
          {t("requote.title")}
          {f.attempts > 1 ? <><br />{t("requote.again")}</> : null}
        </Alert>
      ) : null}
      {busy ? <div className="card space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} h={44} />)}</div> : <PreviewTable quote={q} names={names} diff={f.diff} flash={f.flash} />}
      {skippedNote ? <p className="text-[12px] text-muted">{skippedNote}</p> : null}
      {q.legs.filter((l) => l.impact === "high").map((l) => (
        <Alert key={l.netuid} kind="red">{t("impact.highNote", { subnet: names.get(l.netuid) ?? `SN${l.netuid}`, x: formatTaoNumber((raoToTao(l.estValueTao) * l.slip) / Math.max(1e-9, 1 - l.slip)) })}</Alert>
      ))}
      {changed.length && s === "requoteReady" ? (
        <ChipRow>
          {changed.map((d) => (
            <Chip key={d.netuid} on={false} onClick={() => f.remove(d.netuid)}>{t("requote.remove", { subnet: names.get(d.netuid) ?? `SN${d.netuid}` })}</Chip>
          ))}
          <Link href="/trade" className="flex min-h-8 items-center rounded-full border border-line px-3.5 text-[13px] font-semibold">{t("preview.edit")}</Link>
        </ChipRow>
      ) : null}
      <div className="card space-y-1 p-4 text-[13px]">
        <div className="flex justify-between"><span className="text-muted">{q.side === "sell" ? t("preview.youGet") : t("preview.youPut")}</span><span className="num font-bold">{money.pairRao(total).primary}</span></div>
        <div className="flex justify-between"><span className="text-muted">{t("preview.swapFee")}</span><span className="num">~0.05%</span></div>
      </div>
      <TxStatus f={f} />
      {editable ? (
        <div className="space-y-3">
          {q.side === "add" && q.legs.some((l) => l.kind === "invest") ? <p className="text-[12px] text-muted">{t("trade.risk")}</p> : null}
          <p className="text-[12px] text-muted">{t("preview.limitNote")}</p>
          <div className="flex gap-2">
            <Link href="/trade" className="flex min-h-12 shrink-0 items-center justify-center whitespace-nowrap rounded-[14px] border border-line px-4 font-bold">{t("preview.edit")}</Link>
            <Button full disabled={q.legs.length === 0} onClick={() => f.confirm()}>{confirmLabel}</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
