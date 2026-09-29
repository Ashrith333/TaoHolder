"use client";
import Link from "next/link";
import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import { hasEvmWallet, sendFromEvmWallet } from "@/adapters/wallet/evm";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { useFunding } from "@/stores/funding";
import { formatTao, shortAddress } from "@/services/format";
import { isFinal, type FundingOrder, type FundingOrderState } from "@/services/funding/types";
import { useOrderStatus } from "../useFunding";

const FLOW: FundingOrderState[] = ["awaitingDeposit", "confirming", "converting", "sending", "done"];

/** Deposit instructions + live status for one top-up. */
export function OrderView({ order }: { order: FundingOrder }) {
  const t = useT();
  const { funding } = useConfig();
  useOrderStatus(order);
  const patch = useFunding((s) => s.patch);
  const [copied, setCopied] = useState(false);
  const [evm, setEvm] = useState<{ busy: boolean; hash?: string; error?: string }>({ busy: false });
  const provider = funding.providers.find((p) => p.id === order.provider)?.name ?? order.provider;
  const send = order.steps.find((s) => s.type === "send");
  const at = FLOW.indexOf(order.state);
  const bad = order.state === "failed" || order.state === "refunded" || order.state === "expired";
  const canEvm = send?.type === "send" && !!send.asset.evmChainId && /^0x[0-9a-fA-F]{40}$/.test(send.to) && order.provider !== "demo" && hasEvmWallet();

  return (
    <div className="space-y-4">
      {order.state === "awaitingDeposit" && send?.type === "send" ? (
        <div className="card space-y-3 p-4">
          <p className="text-[15px] font-bold">{t("fund.send", { x: `${send.amount} ${send.asset.symbol}` })}</p>
          <div className="flex items-center gap-2 rounded-[12px] bg-s2 p-3">
            <code className="num min-w-0 flex-1 break-all text-[13px]">{send.to}</code>
            <Button small kind="secondary" onClick={async () => { await navigator.clipboard?.writeText(send.to).catch(() => undefined); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? t("fund.copied") : t("fund.copy")}
            </Button>
          </div>
          {send.memo ? <p className="text-[13px] font-semibold">{t("fund.memo", { memo: send.memo })}</p> : null}
          <Alert kind="red">{t("fund.onlyNetwork", { symbol: send.asset.symbol, network: send.asset.label.split(" on ").pop() ?? send.asset.network })}</Alert>
          {canEvm ? (
            <Button full loading={evm.busy} disabled={!!evm.hash} onClick={async () => {
              setEvm({ busy: true });
              try { setEvm({ busy: false, hash: await sendFromEvmWallet(send.asset, send.to, send.amount) }); }
              catch (e) { setEvm({ busy: false, error: (e as Error).message }); }
            }}>{evm.hash ? t("fund.sentEvm") : t("fund.sendEvm")}</Button>
          ) : null}
          {evm.error ? <Alert kind="red">{evm.error}</Alert> : null}
          {order.provider === "demo" ? (
            <>
              <Button full kind="secondary" disabled={!!order.sentAt} onClick={() => patch(order.id, { sentAt: Date.now() })}>{t("fund.demoSent")}</Button>
              <p className="text-[12px] text-muted">{t("fund.demoNote")}</p>
            </>
          ) : null}
        </div>
      ) : null}

      <ol className="card space-y-2 p-4" aria-label="Progress">
        {FLOW.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 text-[13px] ${i <= at ? "font-semibold text-text" : "text-dim"}`}>
            <span aria-hidden className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${i < at || order.state === "done" ? "bg-primary text-on-primary" : i === at ? "border-2 border-text" : "border border-line"}`}>
              {i < at || order.state === "done" ? "✓" : ""}
            </span>
            {t(`fund.state.${s}`)}
          </li>
        ))}
        {bad ? <li className="text-[13px] font-bold text-red">{t(`fund.state.${order.state}`)}{order.message ? ` · ${order.message}` : ""}</li> : null}
      </ol>

      {order.state === "done" ? (
        <div className="card space-y-3 p-4">
          <p className="text-[15px] font-bold">{t("fund.doneBody", { x: (order.taoReceived ?? order.taoExpected).toFixed(4) })}</p>
          <Link href={`/trade?amount=${Math.floor((order.taoReceived ?? order.taoExpected) * 1e4) / 1e4}`} className="flex min-h-12 items-center justify-center rounded-[14px] bg-primary font-bold text-on-primary">
            {t("fund.stakeIt")}
          </Link>
        </div>
      ) : null}

      <p className="text-[12px] text-muted">
        {t("fund.to", { address: shortAddress(order.toAddress.replace(/^demo-(empty-)?/, "")) })} · {formatTao(order.taoExpected)} {t("fund.via", { provider })}
        {order.trackUrl && !isFinal(order.state) ? <> · <a className="underline" href={order.trackUrl} target="_blank" rel="noreferrer">{t("fund.track", { provider })}</a></> : null}
      </p>
    </div>
  );
}
