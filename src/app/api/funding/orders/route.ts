import { NextResponse } from "next/server";
import { z } from "zod";
import { assetById, providerFor } from "@/adapters/funding/registry";
import { bad, route } from "@/server/respond";
import { parseColdkey } from "@/server/validate";
import { fundingError } from "@/server/funding";

const body = z.object({ provider: z.string().optional(), asset: z.string(), amount: z.number().positive(), toAddress: z.string() });

/** Start a funding order: returns what the user must send (and where). TAO goes to toAddress. */
export const POST = route(async (req) => {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Invalid request");
  const to = await parseColdkey(parsed.data.toAddress);
  if (!to) return bad("Invalid Bittensor address");
  try {
    const asset = await assetById(parsed.data.asset);
    const p = await providerFor(asset, parsed.data.provider);
    return NextResponse.json(await p.create(asset, parsed.data.amount, to), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fundingError(e);
  }
});
