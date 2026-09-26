import { json, route } from "@/server/respond";
import { getSubnets } from "@/server/data";

export const GET = route(async () => {
  const r = await getSubnets();
  return json({ subnets: r.subnets, usd: r.usd }, 60, r.source ?? undefined);
});
