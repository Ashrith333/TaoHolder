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

/**
 * Re-enable the saved wallet (PRD 9.1: auto-reconnect on return). If the site is still
 * authorised the extension answers silently; otherwise it opens its approval pop-up.
 */
export async function restoreWallet(cfg: WalletsConfig, walletId: string, appName: string) {
  const w = cfg.wallets.find((m) => m.id === walletId);
  if (!w) return null;
  const adapter = extensionWallet(w.id, w.injectedKey);
  if (!adapter.detected()) return null;
  const res = await adapter.enable(appName);
  activeSigner = res.signer;
  return res;
}

// The signer lives only in memory for this tab.
let activeSigner: unknown = null;
export const setSigner = (s: unknown) => (activeSigner = s);
export const getSigner = () => activeSigner;
