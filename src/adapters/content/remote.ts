import "server-only";
import { supabaseAnon } from "@/adapters/supabase/client";

// Pull every config document from Supabase. Missing tables/rows return undefined so the
// loader falls back to content/ JSON per document.
export type RemoteDocs = {
  configs: Record<string, unknown>;
  sources?: unknown[];
  subnets?: unknown[];
  validators?: unknown;
  copy?: Record<string, string>;
  sections?: unknown[];
};

type ValidatorRow = { scope: string; netuid: number | null; rank: number; name: string; hotkey: string; take: number | null; enabled: boolean };

/** Rows → { maxTake, all, perNetuid }. scope 'all' = every subnet; scope 'netuid' = that subnet first. */
export function validatorsDoc(rows: ValidatorRow[], maxTake: unknown): unknown {
  const on = rows.filter((r) => r.enabled).sort((a, b) => a.rank - b.rank);
  const entry = (r: ValidatorRow) => ({ name: r.name, hotkey: r.hotkey, take: r.take == null ? undefined : Number(r.take) });
  const perNetuid: Record<string, ReturnType<typeof entry>[]> = {};
  for (const r of on.filter((x) => x.scope === "netuid" && x.netuid != null)) (perNetuid[String(r.netuid)] ??= []).push(entry(r));
  return { maxTake, all: on.filter((r) => r.scope === "all").map(entry), perNetuid };
}

export async function loadRemote(locale = "en"): Promise<RemoteDocs | null> {
  const db = supabaseAnon();
  if (!db) return null;
  const [cfg, src, sn, val, cp, sec] = await Promise.all([
    db.from("app_config").select("key,value"),
    db.from("data_sources").select("*"),
    db.from("subnets").select("*").eq("published", true),
    db.from("validators").select("*"),
    db.from("copy_strings").select("key,text").eq("locale", locale),
    db.from("page_sections").select("*"),
  ]);
  if (cfg.error) throw new Error(`supabase app_config: ${cfg.error.message}`);
  const configs = Object.fromEntries((cfg.data ?? []).map((r) => [r.key as string, r.value as unknown]));
  const nonEmpty = <T,>(rows: T[] | null | undefined) => (rows && rows.length ? rows : undefined);
  return {
    configs,
    sources: nonEmpty(src.data),
    subnets: nonEmpty(sn.data)?.map((r) => ({
      netuid: r.netuid, name: r.name, layer: r.layer, job: r.job, twin: r.twin, stage: r.stage,
      revenueUsd: r.revenue_usd == null ? null : Number(r.revenue_usd), revenueDate: r.revenue_date,
      product: r.product, risks: r.risks ?? [], wins: r.wins ?? [], team: r.team ?? [], links: r.links ?? {},
      curatedAt: r.curated_at,
    })),
    validators: val.data?.length ? validatorsDoc(val.data as ValidatorRow[], (configs["validator-policy"] as { maxTake?: number } | undefined)?.maxTake ?? 0.18) : undefined,
    copy: cp.data?.length ? Object.fromEntries(cp.data.map((r) => [r.key as string, r.text as string])) : undefined,
    sections: nonEmpty(sec.data),
  };
}
