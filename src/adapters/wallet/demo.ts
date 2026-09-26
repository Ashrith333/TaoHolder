import { WalletError, type WalletAdapter } from "./types";

// Demo wallet for local/testnet previews (features.demoWallet). Sample data, nothing signed.
export type DemoMode = "ok" | "locked" | "empty";

export function demoWallet(mode: DemoMode = "ok"): WalletAdapter {
  return {
    id: "demo",
    isDemo: true,
    detected: () => true,
    async enable() {
      await new Promise((r) => setTimeout(r, 250));
      if (mode === "locked") throw new WalletError("locked");
      const address = mode === "empty" ? "demo-empty-5FhAdemo9xQe" : "demo-5FhAxDemoWalletx9xQe";
      return { accounts: [{ address, name: mode === "empty" ? "Empty demo" : "Demo account" }], signer: null };
    },
  };
}
