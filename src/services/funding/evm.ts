// Pure helpers for paying a deposit address from an EVM wallet (no libraries needed).

/** "0.1" with 18 decimals → 100000000000000000n. Extra decimals are dropped (never rounds up). */
export function toBaseUnits(amount: string | number, decimals: number): bigint {
  const [w = "0", f = ""] = String(amount).trim().split(".");
  if (!/^\d*$/.test(w) || !/^\d*$/.test(f)) throw new Error("Invalid amount");
  return BigInt(w || "0") * 10n ** BigInt(decimals) + BigInt((f + "0".repeat(decimals)).slice(0, decimals) || "0");
}

const pad32 = (hex: string) => hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");

/** ERC-20 transfer(address,uint256) calldata. */
export function erc20TransferData(to: string, amount: bigint): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(to)) throw new Error("Deposit address is not an EVM address");
  return `0xa9059cbb${pad32(to)}${pad32(amount.toString(16))}`;
}

export const hexChainId = (id: number) => `0x${id.toString(16)}`;
