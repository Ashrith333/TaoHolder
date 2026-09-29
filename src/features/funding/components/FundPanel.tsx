"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Chip, ChipRow } from "@/components/ui";
import { ConnectCta } from "@/features/wallet";
import { useMounted } from "@/hooks/mounted";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { formatTao } from "@/services/format";
import { useFunding } from "@/stores/funding";
import { useWallet } from "@/stores/wallet";
import { useCreateOrder, useFundingQuote } from "../useFunding";
import { OrderView } from "./OrderView";

/** Top up: pick a token, see how much TAO arrives, get a deposit address, track it. */
export function FundPanel() {
  const t = useT();
  const { funding } = useConfig();
  const mounted = useMounted();
  const address = useWallet((s) => s.address);
  const orders = useFunding((s) => s.orders).filter((o) => o.toAddress === address);
  const [assetId, setAssetId] = useState(funding.assets[0]?.id ?? "");
  const [raw, setRaw] = useState("");
  const [debounced, setDebounced] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(Number(raw) || 0), 400);
    return () => clearTimeout(id);
  }, [raw]);
  const quote = useFundingQuote(assetId, debounced);
  const create = useCreateOrder();
  const asset = funding.assets.find((a) => a.id === assetId);
  const provider = funding.providers.find((p) => p.id === quote.data?.provider);
  const current = orders.find((o) => o.id === openId);

  if (!mounted) return null;
  if (current) {
    return (
      <section className="space-y-4">
        <h1 className="pr-12 text-[22px] font-extrabold">{t("fund.title")}</h1>
        <OrderView order={current} />
        <Button kind="secondary" full onClick={() => setOpenId(null)}>{t("fund.new")}</Button>
      </section>
    );
  }
  return (
    <section className="space-y-4">
      <h1 className="pr-12 text-[22px] font-extrabold">{t("fund.title")}</h1>
      <p className="text-[13px] text-muted">{t("fund.intro")}</p>
      {!funding.providers.length ? <Alert>{t("fund.noRoute")}</Alert> : null}
      <div className="card space-y-3 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("fund.payWith")}</p>
        <ChipRow>{funding.assets.map((a) => <Chip key={a.id} on={a.id === assetId} onClick={() => setAssetId(a.id)}>{a.label}</Chip>)}</ChipRow>
        <label htmlFor="fund-amount" className="block text-[11px] font-semibold uppercase tracking-wider text-muted">{t("fund.amount")}</label>
        <div className="flex items-center rounded-[14px] border border-line bg-s2 px-4 focus-within:border-text">
          <input id="fund-amount" inputMode="decimal" placeholder="0" value={raw} onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, ""))}
            className="num min-h-14 w-full bg-transparent text-[26px] font-extrabold outline-none placeholder:text-dim focus-visible:outline-none" />
          <span className="text-[15px] font-bold text-muted">{asset?.symbol}</span>
        </div>
        {quote.data ? (
          <div className="space-y-1 rounded-[12px] bg-s2 p-3">
            <p className="text-[12px] text-muted">{t("fund.youGet")}</p>
            <p className="num text-[22px] font-extrabold">{formatTao(quote.data.taoOut)}</p>
            <p className="text-[12px] text-muted">
              {t("fund.via", { provider: provider?.name ?? quote.data.provider })}
              {quote.data.etaMinutes ? ` · ${t("fund.eta", { m: quote.data.etaMinutes })}` : ""}
              {quote.data.minAmountIn ? ` · ${t("fund.min", { x: `${quote.data.minAmountIn} ${asset?.symbol}` })}` : ""}
            </p>
            {quote.data.feesNote ? <p className="text-[12px] text-muted">{quote.data.feesNote}</p> : null}
            {quote.data.warning ? <p className="text-[12px] font-semibold text-red">{quote.data.warning}</p> : null}
          </div>
        ) : quote.error ? <Alert kind="red">{(quote.error as Error).message}</Alert> : null}
        {provider ? <p className="text-[12px] text-muted">{provider.custodial ? t("fund.custodial", { provider: provider.name }) : t("fund.nonCustodial")}</p> : null}
        {create.error ? <Alert kind="red">{(create.error as Error).message}</Alert> : null}
        {address ? (
          <Button full disabled={!quote.data || quote.data.taoOut < funding.minTao} loading={create.isPending}
            onClick={() => quote.data && create.mutate({ provider: quote.data.provider, asset: assetId, amount: debounced, toAddress: address }, { onSuccess: (o) => setOpenId(o.id) })}>
            {t("fund.start")}
          </Button>
        ) : (
          <div className="space-y-2"><p className="text-[12px] text-muted">{t("fund.connectFirst")}</p><ConnectCta /></div>
        )}
      </div>
      {orders.length ? (
        <div className="card p-2">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("fund.recent")}</p>
          {orders.slice(0, 5).map((o) => (
            <button key={o.id} onClick={() => setOpenId(o.id)} className="flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left hover:bg-s2">
              <span className="text-[13px] font-semibold">{o.amountIn} {o.asset.symbol} → {formatTao(o.taoReceived ?? o.taoExpected)}</span>
              <span className="text-[12px] text-muted">{t(`fund.state.${o.state}`)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
