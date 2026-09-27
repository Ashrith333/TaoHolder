import { afterEach, describe, expect, it, vi } from "vitest";
import { taostats } from "@/adapters/sources/taostats";
import real from "@content/fixtures/history.json";

const src = { id: "taostats-history", kind: "history" as const, provider: "taostats", network: "mainnet" as const, priority: 10, enabled: true, url: "https://api.taostats.io/api", config: {} };
afterEach(() => vi.unstubAllGlobals());

describe("taostats history provider", () => {
  it("fetches extrinsics, stake events and transfers and builds one list", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      seen.push(url);
      const data = url.includes("/extrinsic/") ? real.extrinsics : url.includes("/delegation/") ? real.stakeEvents : real.transfers;
      return new Response(JSON.stringify({ pagination: { next_page: null }, data }), { status: 200 });
    });
    const r = await taostats.history!(src).history(real.coldkey, 0, 50);
    expect(seen.some((u) => u.includes("/extrinsic/v1?signer_address="))).toBe(true);
    expect(r.items).toHaveLength(19);
    expect(r.hasMore).toBe(false);
  });
  it("still works when one feed fails", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      url.includes("/transfer/") ? new Response("down", { status: 500 }) : new Response(JSON.stringify({ data: url.includes("/extrinsic/") ? real.extrinsics : real.stakeEvents }), { status: 200 }),
    );
    const r = await taostats.history!(src).history(real.coldkey, 0, 50);
    expect(r.items.filter((t) => t.kind === "transfer" && t.transfer?.direction === "in")).toHaveLength(0);
    expect(r.items.find((t) => t.id === "9160959-0026")?.status).toBe("failed");
  });
});
