import "server-only";
import type { Source } from "@/adapters/content/schemas";

// Shared HTTP helper for providers. API keys come from env vars named in source.config.apiKeyEnv.
export async function getJson(src: Source, pathOrUrl: string, revalidate = 30): Promise<unknown> {
  const url = /^https?:/.test(pathOrUrl) ? pathOrUrl : `${src.url ?? ""}${pathOrUrl}`;
  const headers: Record<string, string> = { accept: "application/json" };
  const keyEnv = src.config.apiKeyEnv;
  if (typeof keyEnv === "string" && process.env[keyEnv]) {
    const header = typeof src.config.apiKeyHeader === "string" ? src.config.apiKeyHeader : "Authorization";
    headers[header] = process.env[keyEnv]!;
  }
  const res = await fetch(url, { headers, next: { revalidate }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${src.id}: HTTP ${res.status} for ${url}`);
  return res.json();
}

export function fillPath(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => encodeURIComponent(String(vars[k] ?? "")));
}

export const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);

/** Read a field by name (dot paths allowed), as a number. */
export function field(obj: unknown, key: string): number {
  const v = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
}

export function rows(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  const d = (json as { data?: unknown })?.data;
  return Array.isArray(d) ? d : [];
}
