import "server-only";
import { NextResponse } from "next/server";
import { allow } from "./rateLimit";

export function json(data: unknown, maxAge: number, source?: string) {
  return NextResponse.json(data, {
    headers: {
      "cache-control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
      ...(source ? { "x-data-source": source } : {}),
    },
  });
}

export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

/** Wrap a route: rate limit + uniform error handling. */
export function route(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    if (!allow(req)) return bad("Too many requests", 429);
    try {
      return await handler(req);
    } catch (e) {
      console.error("[api]", e);
      return bad("Network data delayed", 503);
    }
  };
}
