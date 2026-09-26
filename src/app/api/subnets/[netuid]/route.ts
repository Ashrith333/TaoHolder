import { bad, json, route } from "@/server/respond";
import { netuidSchema } from "@/server/validate";
import { getSubnet } from "@/server/data";

export const GET = route(async (req) => {
  const raw = new URL(req.url).pathname.split("/").pop() ?? "";
  const n = netuidSchema.safeParse(raw);
  if (!n.success) return bad("Invalid netuid");
  const r = await getSubnet(n.data);
  return r ? json(r, 60) : bad("Not found", 404);
});
