"use client";
import { useEffect } from "react";
import { getSigner, restoreWallet } from "@/adapters/wallet";
import { useConfig } from "@/providers/ConfigProvider";
import { useWallet } from "@/stores/wallet";

/** On return, silently re-enable the saved wallet so the signer is ready (PRD 9.1). */
export function WalletRestore() {
  const { wallets, app } = useConfig();
  const { address, walletId, demo } = useWallet();
  useEffect(() => {
    if (!address || !walletId || demo || getSigner()) return;
    // Extensions inject shortly after load; give them a moment.
    const id = setTimeout(() => restoreWallet(wallets, walletId, app.name).catch(() => undefined), 500);
    return () => clearTimeout(id);
  }, [address, walletId, demo, wallets, app.name]);
  return null;
}
