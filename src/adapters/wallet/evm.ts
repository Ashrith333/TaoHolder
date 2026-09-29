"use client";
import { erc20TransferData, hexChainId, toBaseUnits } from "@/services/funding/evm";
import type { FundingAsset } from "@/services/funding/types";

// Send a deposit from the browser's EVM wallet (MetaMask, Talisman EVM, Rabby…).
type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
const provider = (): Eip1193 | null => (typeof window === "undefined" ? null : ((window as unknown as { ethereum?: Eip1193 }).ethereum ?? null));

export const hasEvmWallet = () => !!provider();

export async function sendFromEvmWallet(asset: FundingAsset, to: string, amount: number): Promise<string> {
  const eth = provider();
  if (!eth) throw new Error("No EVM wallet found. Install MetaMask or send manually.");
  if (!asset.evmChainId) throw new Error(`${asset.label} can't be sent from an EVM wallet`);
  const [from] = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!from) throw new Error("No EVM account selected");
  await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId(asset.evmChainId) }] });
  const units = toBaseUnits(amount, asset.decimals ?? 18);
  const tx = asset.tokenAddress
    ? { from, to: asset.tokenAddress, data: erc20TransferData(to, units), value: "0x0" }
    : { from, to, value: `0x${units.toString(16)}` };
  return (await eth.request({ method: "eth_sendTransaction", params: [tx] })) as string;
}
