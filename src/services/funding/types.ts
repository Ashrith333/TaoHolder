// "Pay with another token": turn ETH, USDC, SOL… into native TAO in the user's Bittensor
// wallet, then continue to Stake & Invest. Every route is a FundingProvider, so custodial
// swaps (ChangeNOW), bridges (ForeverMoney / Chainlink CCIP) or our own contract can be
// added, switched and ordered from config without touching the UI.

export type FundingKind = "swap-service" | "bridge" | "contract";

/** A token on a specific network the user can pay with. */
export type FundingAsset = {
  id: string; // stable key, e.g. "eth:eth", "usdc:base"
  symbol: string; // ETH
  network: string; // eth, base, sol…
  label: string; // "ETH on Ethereum"
  evmChainId?: number; // set when the user can send it from an EVM wallet (MetaMask etc.)
  tokenAddress?: string; // ERC-20 contract on that chain (absent = native coin)
  decimals?: number;
};

export type FundingQuote = {
  provider: string;
  asset: FundingAsset;
  amountIn: number; // in asset units
  taoOut: number; // estimated TAO delivered to the Bittensor address
  minAmountIn?: number;
  feesNote?: string; // plain-words fee summary from the provider
  etaMinutes?: number;
  validUntil?: string;
  warning?: string;
};

/** What the user must do next. Providers return one or more steps in order. */
export type FundingStep =
  | { type: "send"; to: string; amount: number; asset: FundingAsset; memo?: string } // send funds to a deposit address
  | { type: "evmTx"; chainId: number; to: string; data: string; value: string; label: string } // sign a contract call
  | { type: "wait"; label: string };

export type FundingOrderState =
  | "awaitingDeposit" // nothing received yet
  | "confirming" // deposit seen, waiting for confirmations
  | "converting" // swapping / bridging
  | "sending" // TAO on its way to the Bittensor address
  | "done" // TAO arrived
  | "failed"
  | "refunded"
  | "expired";

export type FundingOrder = {
  id: string;
  provider: string;
  asset: FundingAsset;
  amountIn: number;
  taoExpected: number;
  toAddress: string; // Bittensor SS58 that receives TAO
  steps: FundingStep[];
  state: FundingOrderState;
  taoReceived?: number;
  payinHash?: string;
  payoutHash?: string;
  trackUrl?: string; // provider's own status page
  createdAt: string;
  message?: string; // plain-words note from the provider (e.g. refund reason)
  sentAt?: number; // when the user said they sent the deposit (demo route)
};

export const FINAL_STATES: FundingOrderState[] = ["done", "failed", "refunded", "expired"];
export const isFinal = (s: FundingOrderState) => FINAL_STATES.includes(s);
