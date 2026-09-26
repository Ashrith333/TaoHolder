import type { Layer, SubnetLive } from "./types";

// Bucket membership from buckets.json (D8). Bookmarks come from the user.
export type BucketDef =
  | { label: string; type: "list"; netuids: number[] }
  | { label: string; type: "rule"; sortBy?: "emissionShare" | "mcapTao" | "change7d"; limit?: number; layer?: string; layerNot?: string[] };

export type BucketRow = { netuid: number; layer: Layer; live?: SubnetLive };

export function resolveBucket(
  key: string,
  defs: Record<string, BucketDef>,
  rows: BucketRow[],
  bookmarks: number[],
  exclude: number[] = [],
): number[] {
  const allowed = rows.filter((r) => !exclude.includes(r.netuid));
  if (key === "all") return allowed.map((r) => r.netuid);
  if (key === "bookmarks") return allowed.filter((r) => bookmarks.includes(r.netuid)).map((r) => r.netuid);
  const def = defs[key];
  if (!def) return [];
  if (def.type === "list") return def.netuids.filter((n) => allowed.some((r) => r.netuid === n));
  let out = allowed.filter(
    (r) => (!def.layer || r.layer === def.layer) && (!def.layerNot || !def.layerNot.includes(r.layer)),
  );
  if (def.sortBy) {
    const k = def.sortBy;
    out = [...out].sort((a, b) => (b.live?.[k] ?? 0) - (a.live?.[k] ?? 0));
  }
  return (def.limit ? out.slice(0, def.limit) : out).map((r) => r.netuid);
}
