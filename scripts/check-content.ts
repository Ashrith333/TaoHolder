// Zod-validate every content/ JSON file (PRD 18: build fails on invalid content).
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import * as S from "../src/adapters/content/schemas";

const root = path.resolve(import.meta.dirname, "..");
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const checks: [string, z.ZodType][] = [
  ["content/config/features.json", S.featuresSchema],
  ["content/config/risk-guards.json", S.guardsSchema],
  ["content/config/buckets.json", S.bucketsSchema],
  ["content/config/app.json", S.appSchema],
  ["content/config/wallets.json", S.walletsSchema],
  ["content/config/sources.json", S.sourcesSchema],
  ["content/config/layout.json", S.layoutSchema],
  ["content/validators.json", S.validatorsSchema],
  ["content/copy/en.json", S.copySchema],
  ["content/copy/errors.json", S.copySchema],
];
for (const f of fs.readdirSync(path.join(root, "content/subnets"))) checks.push([`content/subnets/${f}`, S.subnetCuratedSchema]);

let failed = 0;
for (const [file, schema] of checks) {
  const r = schema.safeParse(read(file));
  if (!r.success) {
    failed++;
    console.error(`✗ ${file}`, r.error.issues.slice(0, 5));
  }
}
// Cross-checks: every layout component exists in the registry; every copy key used in config exists.
const registry = fs.readFileSync(path.join(root, "src/sections/registry.tsx"), "utf8");
for (const s of read("content/config/layout.json").sections) {
  if (!registry.includes(`"${s.component}"`)) (failed++, console.error(`✗ layout ${s.id}: unknown component ${s.component}`));
}
const copy = read("content/copy/en.json");
for (const t of [...read("content/config/app.json").tabs, ...read("content/config/app.json").menu]) {
  if (!copy[t.labelKey]) (failed++, console.error(`✗ app.json: missing copy key ${t.labelKey}`));
}
if (failed) process.exit(1);
console.log(`content ok (${checks.length} files)`);
