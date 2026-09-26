import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Read-only anon client. All config tables are public-read under RLS; writes use the
// service role key in scripts/seed-supabase.ts only.
let cached: SupabaseClient | null | undefined;

export function supabaseAnon(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cached;
}
