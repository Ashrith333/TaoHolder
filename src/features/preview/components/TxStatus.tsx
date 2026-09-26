"use client";
import Link from "next/link";
import { Alert, Button } from "@/components/ui";
import { useConfig, useT } from "@/providers/ConfigProvider";
import type { PreviewFlow } from "../usePreviewFlow";

/** S09: Waiting for wallet → Submitted → Done; Rejected; Dropped; failed. */
export function TxStatus({ f }: { f: PreviewFlow }) {
  const t = useT();
  const { explorer } = useConfig();
  const s = f.tx;
  const link = (hash: string) => (explorer ? explorer.replace("{hash}", hash) : null);
  if (s.s === "awaitingSignature") {
    return (
      <div className="space-y-3">
        <Alert kind="note"><b className="text-text">{t("tx.waiting")}</b><br />{t("tx.waitingBody")}</Alert>
        {f.demo ? (
          <div className="grid grid-cols-2 gap-2">
            <Button small onClick={() => f.confirm("approve")}>{t("tx.demoApprove")}</Button>
            <Button small kind="secondary" onClick={() => f.confirm("reject")}>{t("tx.demoReject")}</Button>
            <Button small kind="secondary" onClick={() => f.confirm("priceMoved")}>{t("tx.demoPriceMoved")}</Button>
            <Button small kind="secondary" onClick={() => f.confirm("noBlock")}>{t("tx.demoNoBlock")}</Button>
          </div>
        ) : null}
      </div>
    );
  }
  if (s.s === "submitted" || s.s === "inBlock") {
    return <Alert kind="note"><b className="text-text">{t("tx.submitted")}</b><br />{s.s === "inBlock" ? t("tx.submittedBody", { block: s.block.toLocaleString() }) : t("common.loading")}</Alert>;
  }
  if (s.s === "finalized") {
    const href = link(s.hash);
    return (
      <div className="space-y-3">
        <Alert kind="success"><b>{t("tx.done")}</b> · {t("tx.doneBody", { n: f.quote?.legs.length ?? 0 })}{href ? <> · <a className="underline" href={href} target="_blank" rel="noreferrer">{t("tx.explorer")}</a></> : null}</Alert>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/account" className="flex min-h-12 items-center justify-center rounded-[14px] bg-primary font-bold text-on-primary">{t("tx.viewAccount")}</Link>
          <Link href="/trade" className="flex min-h-12 items-center justify-center rounded-[14px] border border-line font-bold">{t("tx.investMore")}</Link>
        </div>
      </div>
    );
  }
  if (s.s === "rejectedByUser") return <Alert kind="red">{t("tx.rejected")}</Alert>;
  if (s.s === "dropped") {
    return (
      <Alert kind="red" action={<Link href="/history" className="font-bold underline">{t("nav.history")}</Link>}>
        {t("tx.dropped")} {t("tx.droppedBody")}
      </Alert>
    );
  }
  if (s.s === "failedOnChain" && !s.priceLimit) return <Alert kind="red">{s.reason}</Alert>;
  return null;
}
