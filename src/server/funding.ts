import "server-only";
import { NextResponse } from "next/server";
import { FundingError } from "@/adapters/funding/types";

/** Funding errors as plain-words JSON (400 for user-fixable, 503 for provider problems). */
export function fundingError(e: unknown) {
  if (e instanceof FundingError) {
    const status = e.code === "belowMin" || e.code === "unsupported" ? 400 : 503;
    return NextResponse.json({ error: e.message, code: e.code }, { status });
  }
  console.error("[funding]", e);
  return NextResponse.json({ error: "Swap service unavailable. Try again shortly.", code: "provider" }, { status: 503 });
}
