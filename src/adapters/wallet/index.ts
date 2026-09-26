import type { WalletsConfig } from "@/adapters/content/schemas";
import { extensionWallet } from "./extension";
import type { WalletAdapter } from "./types";

export { demoWallet, type DemoMode } from "./demo";
export { WalletError, type WalletAdapter, type InjectedAccount } from "./types";

/** Adapters in config order, detected first (PRD 9.1). */
export function walletAdapters(cfg: WalletsConfig): { meta: WalletsConfig["wallets"][number]; adapter: WalletAdapter }[] {
  const list = cfg.wallets.map((meta) => ({ meta, adapter: extensionWallet(meta.id, meta.injectedKey) }));
  return [...list.filter((w) => w.adapter.detected()), ...list.filter((w) => !w.adapter.detected())];
}

// The signer lives only in memory for this tab.
let activeSigner: unknown = null;
export const setSigner = (s: unknown) => (activeSigner = s);
export const getSigner = () => activeSigner;
