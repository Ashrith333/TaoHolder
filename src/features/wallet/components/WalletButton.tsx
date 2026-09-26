"use client";
import { useState } from "react";
import { useMounted } from "@/hooks/mounted";
import { useT } from "@/providers/ConfigProvider";
import { shortAddress } from "@/services/format";
import { useWallet } from "@/stores/wallet";
import { ConnectSheet } from "./ConnectSheet";

/** Solid "Connect wallet" pill; becomes the address pill with a dot once connected. */
export function WalletButton() {
  const t = useT();
  const mounted = useMounted();
  const address = useWallet((s) => s.address);
  const [open, setOpen] = useState(false);
  if (mounted && address) {
    return (
      <span className="num inline-flex h-9 items-center gap-2 rounded-full border border-line px-3 text-[13px] font-semibold">
        <span className="h-2 w-2 rounded-full bg-text" aria-hidden />
        {shortAddress(address.replace(/^demo-(empty-)?/, ""))}
      </span>
    );
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="h-9 rounded-full bg-primary px-4 text-[13px] font-bold text-on-primary">
        {t("connect.cta")}
      </button>
      <ConnectSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Big CTA used on S01 and gated screens. */
export function ConnectCta({ full = true }: { full?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={`min-h-12 rounded-[14px] bg-primary px-5 text-[15px] font-bold text-on-primary ${full ? "w-full" : ""}`}>
        {t("connect.cta")}
      </button>
      <ConnectSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
