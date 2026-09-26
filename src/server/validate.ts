import "server-only";
import { z } from "zod";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { loadConfig } from "@/adapters/content/load";

// Route input validation (PRD 16.5). Demo coldkeys only work off mainnet with demoWallet on.
export async function parseColdkey(raw: string | null): Promise<string | null> {
  if (!raw) return null;
  const cfg = await loadConfig();
  if (raw.startsWith("demo-")) return cfg.network !== "mainnet" && cfg.features.demoWallet ? raw : null;
  try {
    return encodeAddress(decodeAddress(raw), cfg.wallets.ss58Prefix);
  } catch {
    return null;
  }
}

export const netuidSchema = z.coerce.number().int().min(0).max(65535);

export function parseNetuids(raw: string | null): number[] | null {
  if (!raw) return [];
  const parts = raw.split(",").map((p) => netuidSchema.safeParse(p));
  return parts.every((p) => p.success) ? parts.map((p) => p.data as number) : null;
}
