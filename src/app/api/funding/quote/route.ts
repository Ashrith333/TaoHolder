import { NextResponse } from "next/server";
import { assetById, providerFor } from "@/adapters/funding/registry";
import { bad, route } from "@/server/respond";
import { fundingError } from "@/server/funding";

export const GET = route(async (req) => {
  const q = new URL(req.url).searchParams;
  const amount = Number(q.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) return bad("Enter an amount");
  try {
    const asset = await assetById(q.get("asset") ?? "");
    const p = await providerFor(asset, q.get("provider"));
    return NextResponse.json(await p.quote(asset, amount), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fundingError(e);
  }
});
