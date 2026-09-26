import { bad, json, route } from "@/server/respond";
import { parseColdkey } from "@/server/validate";
import { getHistory } from "@/server/data";

export const GET = route(async (req) => {
  const q = new URL(req.url).searchParams;
  const coldkey = await parseColdkey(q.get("coldkey"));
  if (!coldkey) return bad("Invalid coldkey");
  const cursor = Math.max(0, Number(q.get("cursor") ?? 0) || 0);
  return json(await getHistory(coldkey, cursor), 30);
});
