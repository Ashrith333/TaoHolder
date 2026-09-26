import { bad, json, route } from "@/server/respond";
import { parseColdkey } from "@/server/validate";
import { getPositions } from "@/server/data";

export const GET = route(async (req) => {
  const coldkey = await parseColdkey(new URL(req.url).searchParams.get("coldkey"));
  if (!coldkey) return bad("Invalid coldkey");
  const r = await getPositions(coldkey);
  return json(r.positions, 10, r.source);
});
