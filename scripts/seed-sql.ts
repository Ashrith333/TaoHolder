// Builds the seed SQL from content/ (the git source of truth). Used by seed-supabase.ts
// and printable with `tsx scripts/seed-sql.ts > seed.sql` for the Supabase SQL editor.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const q = (v: unknown) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const arr = (v: string[]) => `array[${v.map(q).join(",")}]::text[]`;

export function seedSql(): string {
  const out: string[] = ["begin;"];
  const docs: Record<string, [string, string]> = {
    app: ["content/config/app.json", "App name, domain, tabs, menu, refresh"],
    features: ["content/config/features.json", "Feature switches (D4, D12)"],
    "risk-guards": ["content/config/risk-guards.json", "Guard thresholds (PRD 13)"],
    buckets: ["content/config/buckets.json", "Filter buckets (D8)"],
    wallets: ["content/config/wallets.json", "Supported wallet extensions"],
    errors: ["content/copy/errors.json", "Chain error name → plain words"],
  };
  for (const [key, [file, desc]] of Object.entries(docs)) {
    out.push(`insert into public.app_config (key, value, description) values (${q(key)}, ${j(read(file))}, ${q(desc)}) on conflict (key) do update set value = excluded.value, description = excluded.description;`);
  }
  for (const s of read("content/config/sources.json").sources) {
    out.push(`insert into public.data_sources (id, kind, provider, url, config, priority, enabled, network) values (${q(s.id)}, ${q(s.kind)}, ${q(s.provider)}, ${q(s.url ?? null)}, ${j(s.config ?? {})}, ${s.priority}, ${s.enabled}, ${q(s.network)}) on conflict (id) do update set kind = excluded.kind, provider = excluded.provider, url = excluded.url, config = excluded.config, priority = excluded.priority, enabled = excluded.enabled, network = excluded.network;`);
  }
  for (const s of read("content/config/layout.json").sections) {
    out.push(`insert into public.page_sections (id, page, component, position, enabled, props) values (${q(s.id)}, ${q(s.page)}, ${q(s.component)}, ${s.position}, ${s.enabled}, ${j(s.props ?? {})}) on conflict (id) do update set page = excluded.page, component = excluded.component, position = excluded.position, enabled = excluded.enabled, props = excluded.props;`);
  }
  const dir = path.join(root, "content/subnets");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const s = read(`content/subnets/${f}`);
    out.push(`insert into public.subnets (netuid, name, layer, job, twin, stage, revenue_usd, revenue_date, product, risks, wins, team, links, curated_at) values (${s.netuid}, ${q(s.name)}, ${q(s.layer)}, ${q(s.job)}, ${q(s.twin)}, ${q(s.stage)}, ${s.revenueUsd ?? "null"}, ${q(s.revenueDate)}, ${q(s.product)}, ${arr(s.risks)}, ${arr(s.wins)}, ${arr(s.team)}, ${j(s.links)}, ${q(s.curatedAt)}) on conflict (netuid) do update set name = excluded.name, layer = excluded.layer, job = excluded.job, twin = excluded.twin, stage = excluded.stage, revenue_usd = excluded.revenue_usd, revenue_date = excluded.revenue_date, product = excluded.product, risks = excluded.risks, wins = excluded.wins, team = excluded.team, links = excluded.links, curated_at = excluded.curated_at;`);
  }
  const v = read("content/validators.json");
  out.push("delete from public.validators;");
  type VE = { name: string; hotkey: string; take?: number };
  const vrow = (scope: string, netuid: number | null, rank: number, e: VE) =>
    `insert into public.validators (scope, netuid, rank, name, hotkey, take) values (${q(scope)}, ${netuid ?? "null"}, ${rank}, ${q(e.name)}, ${q(e.hotkey)}, ${e.take ?? "null"});`;
  (v.all as VE[]).forEach((e, i) => out.push(vrow("all", null, i, e)));
  for (const [n, list] of Object.entries(v.perNetuid)) (list as VE[]).forEach((e, i) => out.push(vrow("netuid", Number(n), i, e)));
  out.push(`insert into public.app_config (key, value, description) values ('validator-policy', ${j({ maxTake: v.maxTake })}, 'Validator rules (D3)') on conflict (key) do update set value = excluded.value;`);
  const copy = read("content/copy/en.json") as Record<string, string>;
  const values = Object.entries(copy).map(([k, t]) => `('en', ${q(k)}, ${q(t)})`);
  out.push(`insert into public.copy_strings (locale, key, text) values ${values.join(",\n")} on conflict (locale, key) do update set text = excluded.text;`);
  out.push("commit;");
  return out.join("\n");
}

if (process.argv[1]?.endsWith("seed-sql.ts")) process.stdout.write(seedSql() + "\n");
