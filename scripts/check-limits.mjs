// Monolith check (PRD 19, A9): fail on any file over its hard line limit.
import fs from "node:fs";
import path from "node:path";

const LIMITS = [
  { test: (f) => /src\/app\/.*page\.tsx$/.test(f), soft: 80, hard: 150 },
  { test: (f) => /src\/services\//.test(f), soft: 200, hard: 300 },
  { test: (f) => /\.(tsx|ts)$/.test(f) && f.includes("src/"), soft: 200, hard: 350 },
];

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
  }
})("src");

let failed = false;
for (const f of files) {
  const rule = LIMITS.find((l) => l.test(f));
  if (!rule) continue;
  const lines = fs.readFileSync(f, "utf8").split("\n").length;
  if (lines > rule.hard) {
    console.error(`✗ ${f}: ${lines} lines (hard limit ${rule.hard})`);
    failed = true;
  } else if (lines > rule.soft) console.warn(`! ${f}: ${lines} lines (soft limit ${rule.soft})`);
}
if (failed) process.exit(1);
console.log(`line limits ok (${files.length} files)`);
