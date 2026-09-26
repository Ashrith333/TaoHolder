import { WalletError, type InjectedAccount, type WalletAdapter } from "./types";

// Any Substrate extension that injects into window.injectedWeb3[key]
// (Talisman, SubWallet, Polkadot.js, TAO.com). The key comes from wallets.json.
type Injected = { accounts: { get: () => Promise<InjectedAccount[]> }; signer: unknown };
type InjectedWindow = Window & {
  injectedWeb3?: Record<string, { enable: (origin: string) => Promise<Injected> }>;
};

export function extensionWallet(id: string, injectedKey: string): WalletAdapter {
  const source = () => (typeof window === "undefined" ? undefined : (window as InjectedWindow).injectedWeb3?.[injectedKey]);
  return {
    id,
    isDemo: false,
    detected: () => !!source(),
    async enable(appName) {
      const src = source();
      if (!src) throw new WalletError("missing");
      let injected: Injected;
      try {
        injected = await src.enable(appName);
      } catch (e) {
        const msg = String((e as Error)?.message ?? e).toLowerCase();
        if (msg.includes("reject") || msg.includes("cancel") || msg.includes("not allowed")) throw new WalletError("rejected");
        throw new WalletError("locked", msg);
      }
      const accounts = await injected.accounts.get();
      if (!accounts.length) throw new WalletError("noAccounts");
      return { accounts: accounts.map((a) => ({ address: a.address, name: a.name })), signer: injected.signer };
    },
  };
}
