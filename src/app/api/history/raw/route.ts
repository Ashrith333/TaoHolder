import { NextResponse } from "next/server";
import { bad, route } from "@/server/respond";
import { parseColdkey } from "@/server/validate";
import { historyRaw } from "@/server/historyRaw";

export const GET = route(async (req) => {
  const coldkey = await parseColdkey(new URL(req.url).searchParams.get("coldkey"));
  if (!coldkey) return bad("Invalid coldkey");
  return NextResponse.json(await historyRaw(coldkey), {
    headers: { "cache-control": "no-store", "content-disposition": `inline; filename="taoholder-history-${coldkey.slice(0, 6)}.json"` },
  });
});
