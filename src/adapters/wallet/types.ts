// Wallet adapter contract. Only the injected signer is used — never signRaw, never keys.
export type InjectedAccount = { address: string; name?: string };
export type Signer = unknown; // @polkadot/api Signer from the extension

export type WalletErrorCode = "locked" | "noAccounts" | "rejected" | "missing";
export class WalletError extends Error {
  constructor(public code: WalletErrorCode, message?: string) {
    super(message ?? code);
  }
}

export interface WalletAdapter {
  id: string;
  isDemo: boolean;
  detected(): boolean;
  enable(appName: string): Promise<{ accounts: InjectedAccount[]; signer: Signer }>;
}
