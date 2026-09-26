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

type ValidatorRow = { scope: string; netuid: number | null; name: string; hotkey: string; max_take: number | null; take?: number | null; enabled: boolean };

function validatorsDoc(rows: ValidatorRow[]): unknown {
  const on = rows.filter((r) => r.enabled);
  const entry = (r: ValidatorRow) => ({ name: r.name, hotkey: r.hotkey, maxTake: r.max_take ?? undefined, take: r.take ?? undefined });
  const def = on.find((r) => r.scope === "default");
  const fb = on.find((r) => r.scope === "fallback");
  if (!def || !fb) return undefined;
  const perNetuid = Object.fromEntries(on.filter((r) => r.scope === "netuid").map((r) => [String(r.netuid), entry(r)]));
  return { default: entry(def), fallback: entry(fb), perNetuid };
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
    validators: val.data?.length ? validatorsDoc(val.data as ValidatorRow[]) : undefined,
    copy: cp.data?.length ? Object.fromEntries(cp.data.map((r) => [r.key as string, r.text as string])) : undefined,
    sections: nonEmpty(sec.data),
  };
}
