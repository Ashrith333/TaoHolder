import type { FundingConfig } from "@/adapters/content/schemas";
import type { FundingAsset, FundingOrder, FundingQuote } from "@/services/funding/types";

export type ProviderConfig = FundingConfig["providers"][number];
export type StatusUpdate = Pick<FundingOrder, "state"> & Partial<Pick<FundingOrder, "taoReceived" | "payinHash" | "payoutHash" | "message">>;

/** Server-side side of a funding route. Add one by writing this and registering it in registry.ts. */
export interface FundingAdapter {
  id: string;
  supports(asset: FundingAsset): boolean;
  quote(asset: FundingAsset, amountIn: number): Promise<FundingQuote>;
  create(asset: FundingAsset, amountIn: number, toAddress: string): Promise<FundingOrder>;
  /** `sentAt` (ms) is set when the user says they sent the deposit; only the demo route uses it. */
  status(orderId: string, opts?: { sentAt?: number }): Promise<StatusUpdate>;
}

export class FundingError extends Error {
  constructor(public code: "unsupported" | "belowMin" | "provider" | "notReady", message: string) {
    super(message);
  }
}
