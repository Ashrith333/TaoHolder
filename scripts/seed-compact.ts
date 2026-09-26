// Compact, set-based variant of the seed (one statement per table). Same result as seed-sql.ts.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const lit = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

export function seedCompact(): string[] {
  const configs = {
    app: read("content/config/app.json"),
    features: read("content/config/features.json"),
    "risk-guards": read("content/config/risk-guards.json"),
    buckets: read("content/config/buckets.json"),
    wallets: read("content/config/wallets.json"),
    errors: read("content/copy/errors.json"),
  };
  const subnets = fs.readdirSync(path.join(root, "content/subnets")).map((f) => read(`content/subnets/${f}`));
  const v = read("content/validators.json");
  const vals = [
    { scope: "default", netuid: null, ...v.default },
    { scope: "fallback", netuid: null, ...v.fallback },
    ...Object.entries(v.perNetuid).map(([n, e]) => ({ scope: "netuid", netuid: Number(n), ...(e as object) })),
  ];
  const a = `insert into public.app_config (key, value) select key, value from jsonb_each(${lit(configs)}) on conflict (key) do update set value = excluded.value;
insert into public.data_sources (id, kind, provider, url, config, priority, enabled, network) select id, kind, provider, url, coalesce(config,'{}'), priority, enabled, network from jsonb_to_recordset(${lit(read("content/config/sources.json").sources)}) as x(id text, kind text, provider text, url text, config jsonb, priority int, enabled boolean, network text) on conflict (id) do update set kind=excluded.kind, provider=excluded.provider, url=excluded.url, config=excluded.config, priority=excluded.priority, enabled=excluded.enabled, network=excluded.network;
insert into public.page_sections (id, page, component, position, enabled, props) select id, page, component, position, enabled, coalesce(props,'{}') from jsonb_to_recordset(${lit(read("content/config/layout.json").sections)}) as x(id text, page text, component text, position int, enabled boolean, props jsonb) on conflict (id) do update set page=excluded.page, component=excluded.component, position=excluded.position, enabled=excluded.enabled, props=excluded.props;`;
  const b = `insert into public.subnets (netuid, name, layer, job, twin, stage, revenue_usd, revenue_date, product, risks, wins, team, links, curated_at) select "netuid", "name", "layer", "job", "twin", "stage", "revenueUsd", "revenueDate"::date, "product", array(select jsonb_array_elements_text("risks")), array(select jsonb_array_elements_text("wins")), array(select jsonb_array_elements_text("team")), "links", "curatedAt"::date from jsonb_to_recordset(${lit(subnets)}) as x("netuid" int, "name" text, "layer" text, "job" text, "twin" text, "stage" text, "revenueUsd" numeric, "revenueDate" text, "product" text, "risks" jsonb, "wins" jsonb, "team" jsonb, "links" jsonb, "curatedAt" text) on conflict (netuid) do update set name=excluded.name, layer=excluded.layer, job=excluded.job, twin=excluded.twin, stage=excluded.stage, revenue_usd=excluded.revenue_usd, revenue_date=excluded.revenue_date, product=excluded.product, risks=excluded.risks, wins=excluded.wins, team=excluded.team, links=excluded.links, curated_at=excluded.curated_at;
delete from public.validators;
insert into public.validators (scope, netuid, name, hotkey, max_take, take) select scope, netuid, name, hotkey, "maxTake", take from jsonb_to_recordset(${lit(vals)}) as x(scope text, netuid int, name text, hotkey text, "maxTake" numeric, take numeric);`;
  const c = `insert into public.copy_strings (locale, key, text) select 'en', key, value from jsonb_each_text(${lit(read("content/copy/en.json"))}) on conflict (locale, key) do update set text = excluded.text;`;
  return [a, b, c];
}

if (process.argv[1]?.endsWith("seed-compact.ts")) {
  const out = process.argv[2] ?? ".";
  seedCompact().forEach((s, i) => fs.writeFileSync(path.join(out, `seed-${i}.sql`), s));
}
