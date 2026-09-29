import { FundingError, type FundingAdapter, type ProviderConfig } from "./types";

// ForeverMoney (Chainlink CCIP): non-custodial. From Base: swap ETH/USDC → wTAO, then the
// Base Gateway's bridgeOut sends it to the user's Bittensor SS58 address (bytes32).
// Addresses come from Talisman's open-source integration and live in funding.json.
// Not live: the gateway ABI (quoteBridgeOut / bridgeOut argument layout) must be verified
// with a small real transfer first. Until then every call refuses, so no funds can move.
export function forevermoney(p: ProviderConfig): FundingAdapter {
  const chains = (p.config.sourceChains ?? {}) as Record<string, { chainId: number }>;
  const refuse = (): never => {
    throw new FundingError("notReady", "ForeverMoney route is not verified yet");
  };
  return {
    id: p.id,
    supports: (a) => a.network in chains,
    quote: async () => refuse(),
    create: async () => refuse(),
    status: async () => refuse(),
  };
}
