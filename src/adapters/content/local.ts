import "server-only";
import fs from "node:fs";
import path from "node:path";
import app from "@content/config/app.json";
import features from "@content/config/features.json";
import guards from "@content/config/risk-guards.json";
import buckets from "@content/config/buckets.json";
import wallets from "@content/config/wallets.json";
import sources from "@content/config/sources.json";
import layout from "@content/config/layout.json";
import validators from "@content/validators.json";
import copy from "@content/copy/en.json";
import errors from "@content/copy/errors.json";

// Local JSON in content/ is the source of truth in git and the fallback when Supabase
// is not configured or unreachable.
export const localDocs = { app, features, guards, buckets, wallets, sources, layout, validators, copy, errors };

export function localSubnets(): unknown[] {
  const dir = path.join(process.cwd(), "content", "subnets");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as unknown);
}
