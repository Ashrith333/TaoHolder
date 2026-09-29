import { NextResponse } from "next/server";
import { activeProviders } from "@/adapters/funding/registry";
import { bad, route } from "@/server/respond";
import { fundingError } from "@/server/funding";

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const id = decodeURIComponent(url.pathname.split("/").pop() ?? "");
  const provider = url.searchParams.get("provider");
  if (!id || !/^[\w-]{1,80}$/.test(id)) return bad("Invalid order id");
  try {
    const p = (await activeProviders()).find((x) => x.id === provider);
    if (!p) return bad("Unknown provider");
    const sentAt = Number(url.searchParams.get("sentAt")) || undefined;
    return NextResponse.json(await p.status(id, { sentAt }), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fundingError(e);
  }
});
