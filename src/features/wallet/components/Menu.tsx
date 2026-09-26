"use client";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet } from "@/components/ui";
import { useMounted } from "@/hooks/mounted";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { useWallet } from "@/stores/wallet";
import { setSigner } from "@/adapters/wallet";

/** Menu: History, Settings, Copy address, Disconnect (red), Legal (PRD 9.10). Items from app.json. */
export function Menu() {
  const t = useT();
  const { app } = useConfig();
  const mounted = useMounted();
  const qc = useQueryClient();
  const { address, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button aria-label={t("nav.menu")} onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full border border-line">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      <Sheet open={open} onClose={close} title={t("nav.menu")}>
        <nav className="flex flex-col">
          {app.menu.map((m) => (
            <Link key={m.href} href={m.href} onClick={close} className="flex min-h-12 items-center border-b border-line text-[15px] font-semibold">
              {t(m.labelKey)}
            </Link>
          ))}
          {mounted && address ? (
            <>
              <button
                className="flex min-h-12 items-center border-b border-line text-left text-[15px] font-semibold"
                onClick={async () => {
                  await navigator.clipboard?.writeText(address).catch(() => undefined);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? t("nav.copied") : t("nav.copyAddress")}
              </button>
              <button
                className="flex min-h-12 items-center text-left text-[15px] font-bold text-red"
                onClick={() => {
                  disconnect();
                  setSigner(null);
                  qc.clear();
                  close();
                }}
              >
                {t("nav.disconnect")}
              </button>
            </>
          ) : null}
        </nav>
      </Sheet>
    </>
  );
}
