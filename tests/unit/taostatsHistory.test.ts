import { afterEach, describe, expect, it, vi } from "vitest";
import { taostats } from "@/adapters/sources/taostats";

const ME = "5FHMJa4U21RZPYQsnC5u4tStFFHGnKfZvrhvKkLWxHk2K1T2";
const src = {
  id: "taostats-history", kind: "history" as const, provider: "taostats", network: "mainnet" as const, priority: 10, enabled: true,
  url: "https://api.taostats.io/api", config: { transfersPath: "/transfer/v1?address={coldkey}" },
};

afterEach(() => vi.unstubAllGlobals());

describe("taostats history", () => {
  it("groups one batch into one transaction; netuid 0 = stake, missing netuid is not root; transfers get a direction", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      const data = url.includes("/delegation/")
        ? [
            { action: "DELEGATE", netuid: 0, amount: "1000000000", hotkey: { ss58: "5HK" }, extrinsic_id: "100-2", block_number: 100, timestamp: "2026-09-27T10:00:00Z" },
            { action: "DELEGATE", netuid: 9, amount: "500000000", alpha: "20000000000", hotkey: { ss58: "5HK" }, extrinsic_id: "100-2", block_number: 100, timestamp: "2026-09-27T10:00:00Z" },
            { action: "UNDELEGATE", netuid: 51, amount: "1200000000", alpha: "30000000000", extrinsic_id: "90-1", block_number: 90, timestamp: "2026-09-26T10:00:00Z" },
            { action: "DELEGATE", amount: "100000000", extrinsic_id: "80-1", block_number: 80, timestamp: "2026-09-25T10:00:00Z" },
          ]
        : [{ from: { ss58: "5OTHER" }, to: { ss58: ME }, amount: "5000000000", extrinsic_id: "70-1", block_number: 70, timestamp: "2026-09-24T10:00:00Z" }];
      return new Response(JSON.stringify({ data }), { status: 200 });
    });
    const { items } = await taostats.history!(src).history(ME, 0, 25);
    expect(items.map((i) => i.id)).toEqual(["100-2", "90-1", "80-1", "70-1"]);
    expect(items[0]!.legs.map((l) => [l.type, l.netuid])).toEqual([["stake", 0], ["invest", 9]]);
    expect(items[0]!.legs[1]).toMatchObject({ tao: 0.5, tokens: 20 });
    expect(items[1]!.legs[0]).toMatchObject({ type: "sell", netuid: 51, tao: 1.2, tokens: 30 });
    expect(items[2]!.legs[0]).toMatchObject({ type: "invest", netuid: null });
    expect(items[3]).toMatchObject({ kind: "transfer", transfer: { direction: "in", tao: 5, counterparty: "5OTHER" } });
  });
});
