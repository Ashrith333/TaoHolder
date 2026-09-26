"use client";
import { useMemo, useState } from "react";
import { walletAdapters } from "@/adapters/wallet";
import { Alert, Button, Sheet } from "@/components/ui";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { shortAddress } from "@/services/format";
import { useConnect } from "../useConnect";

export function ConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const cfg = useConfig();
  const c = useConnect(onClose);
  const [noWallet, setNoWallet] = useState(false);
  const wallets = useMemo(() => (open ? walletAdapters(cfg.wallets) : []), [open, cfg.wallets]);
  const demoOk = cfg.features.demoWallet && cfg.network !== "mainnet";
  const anyDetected = wallets.some((w) => w.adapter.detected());

  if (c.pick) {
    return (
      <Sheet open={open} onClose={onClose} title={t("connect.pickAccount")}>
        <ul className="space-y-2">
          {c.pick.accounts.map((a) => (
            <li key={a.address}>
              <button onClick={() => c.finish(c.pick!.adapter, a)} className="flex min-h-14 w-full items-center justify-between rounded-[12px] bg-s2 px-4 text-left hover:bg-s3">
                <span className="font-semibold">{a.name ?? shortAddress(a.address)}</span>
                <span className="num text-[12px] text-muted">{shortAddress(a.address)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("connect.title")}>
      <p className="mb-4 text-[13px] text-muted">{t("connect.domain", { domain: cfg.app.domain })}</p>
      {c.error ? (
        <div className="mb-3">
          <Alert kind="red">{c.error.code === "noAccounts" ? t("connect.noAccounts", { wallet: c.error.wallet }) : t("connect.locked")}</Alert>
        </div>
      ) : null}
      <ul className="space-y-2">
        {wallets.map(({ meta, adapter }) => (
          <li key={meta.id} className="flex min-h-14 items-center justify-between rounded-[12px] bg-s2 px-4">
            <span className="font-semibold">{meta.name}</span>
            {adapter.detected() ? (
              <Button small loading={c.busy === meta.id} onClick={() => c.start(adapter, meta.name)}>{t("connect.connect")}</Button>
            ) : (
              <a href={meta.installUrl} target="_blank" rel="noreferrer" className="rounded-[10px] border border-line px-3 py-2 text-[13px] font-bold">{t("connect.get")}</a>
            )}
          </li>
        ))}
      </ul>
      {!anyDetected ? (
        <button onClick={() => setNoWallet((v) => !v)} className="mt-3 text-[13px] font-semibold underline underline-offset-4">{t("connect.noWallet")}</button>
      ) : null}
      {noWallet ? <p className="mt-2 text-[13px] text-muted">{t("connect.noWalletBody", { domain: cfg.app.domain })}</p> : null}
      {demoOk ? (
        <div className="mt-5 space-y-2 border-t border-line pt-4">
          <Button full kind="secondary" loading={c.busy === "demo"} onClick={() => c.startDemo("ok")}>{t("connect.demo")}</Button>
          <div className="flex gap-2">
            <Button small kind="ghost" className="flex-1" onClick={() => c.startDemo("locked")}>{t("connect.demoLocked")}</Button>
            <Button small kind="ghost" className="flex-1" onClick={() => c.startDemo("empty")}>{t("connect.demoEmpty")}</Button>
          </div>
          <p className="text-[11.5px] text-dim">{t("connect.demoNote")}</p>
        </div>
      ) : null}
      <p className="mt-5 text-[12px] text-muted">{t("connect.privacy")}</p>
    </Sheet>
  );
}
