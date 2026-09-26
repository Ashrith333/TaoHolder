import "server-only";

// Per-IP token bucket (PRD 16.5). In-memory per instance; good enough for v1.
const buckets = new Map<string, { tokens: number; at: number }>();
const RATE = 60; // requests
const WINDOW_MS = 60_000;

export function allow(req: Request): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const b = buckets.get(ip) ?? { tokens: RATE, at: now };
  b.tokens = Math.min(RATE, b.tokens + ((now - b.at) / WINDOW_MS) * RATE);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(ip, b);
  if (buckets.size > 10_000) buckets.clear();
  return true;
}
