import { bad, json, route } from "@/server/respond";
import { parseNetuids } from "@/server/validate";
import { getPools } from "@/server/data";

export const GET = route(async (req) => {
  const netuids = parseNetuids(new URL(req.url).searchParams.get("netuids"));
  if (!netuids) return bad("Invalid netuids");
  const r = await getPools(netuids);
  return json({ pools: r.pools, at: Date.now() }, 6, r.source);
});
