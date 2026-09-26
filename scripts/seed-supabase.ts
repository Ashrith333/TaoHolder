// Push content/ into Supabase (upsert). Needs SUPABASE_DB_URL (Postgres connection string
// from Project Settings → Database). Alternatively print SQL with `tsx scripts/seed-sql.ts`
// and paste it into the Supabase SQL editor.
import { execFileSync } from "node:child_process";
import { seedSql } from "./seed-sql";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Set SUPABASE_DB_URL, or run: pnpm tsx scripts/seed-sql.ts > seed.sql and paste it into the SQL editor.");
  process.exit(1);
}
execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-q"], { input: seedSql(), stdio: ["pipe", "inherit", "inherit"] });
console.log("Seeded Supabase from content/.");
