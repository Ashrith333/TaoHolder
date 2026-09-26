"use client";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { demoWallet, setSigner, WalletError, type DemoMode, type InjectedAccount, type WalletAdapter } from "@/adapters/wallet";
import { useConfig } from "@/providers/ConfigProvider";
import { useWallet } from "@/stores/wallet";
import { track } from "@/adapters/analytics";

// Connect flow (S02): enable → pick account → Account. No signature during connect.
export function useConnect(onDone: () => void) {
  const { app } = useConfig();
  const qc = useQueryClient();
  const connect = useWallet((s) => s.connect);
  const [error, setError] = useState<{ code: WalletError["code"]; wallet: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pick, setPick] = useState<{ adapter: WalletAdapter; accounts: InjectedAccount[] } | null>(null);

  const finish = useCallback(
    (adapter: WalletAdapter, account: InjectedAccount) => {
      connect(adapter.id, account, adapter.isDemo);
      qc.invalidateQueries({ queryKey: ["positions"] });
      track("connect_done", { wallet: adapter.id });
      setPick(null);
      onDone();
    },
    [connect, qc, onDone],
  );

  const start = useCallback(
    async (adapter: WalletAdapter, name: string) => {
      setError(null);
      setBusy(adapter.id);
      track("connect_started", { wallet: adapter.id });
      try {
        const { accounts, signer } = await adapter.enable(app.name);
        setSigner(signer);
        if (accounts.length === 1) finish(adapter, accounts[0]!);
        else setPick({ adapter, accounts });
      } catch (e) {
        const code = e instanceof WalletError ? e.code : "locked";
        if (code !== "rejected") setError({ code, wallet: name }); // user reject: close quietly
        else onDone();
      } finally {
        setBusy(null);
      }
    },
    [app.name, finish, onDone],
  );

  const startDemo = useCallback((mode: DemoMode) => start(demoWallet(mode), "Demo"), [start]);
  return { start, startDemo, finish, error, busy, pick, clearPick: () => setPick(null) };
}
