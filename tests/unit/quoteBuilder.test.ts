import { describe, expect, it } from "vitest";
import { buildAddQuote, buildSellQuote } from "@/services/quoteBuilder";
import { diffQuotes } from "@/services/quoteDiff";
import { buildBatch } from "@/services/buildBatch";
import { parseTao } from "@/services/rao";
import { cfg, pool, validators } from "../fixtures/pools";

const amt = (s: string) => parseTao(s)!;
const pools = new Map([[64, pool(64, 98_000, 0.1)], [4, pool(4, 400, 0.07)], [51, pool(51, 5_000, 0.05)]]);
const ctx = { pools, validators, cfg, now: 0, id: "q1" };

describe("quote builder", () => {
  it("root first, skips thin pool, marks high impact without skipping", () => {
    const q = buildAddQuote(ctx, amt("15"), [
      { netuid: 64, amount: amt("10") },
      { netuid: 4, amount: amt("10") },
      { netuid: 51, amount: amt("200") },
    ]);
    expect(q.legs[0]?.kind).toBe("stakeRoot");
    expect(q.skipped).toEqual([{ netuid: 4, reason: "thinPool" }]);
    const big = q.legs.find((l) => l.netuid === 51)!;
    expect(big.impact).toBe("high");
    expect(q.expiresAt).toBe(45_000);
  });
  it("sell quote unstakes root 1:1", () => {
    const q = buildSellQuote(ctx, [{ netuid: 0, hotkey: "5A", amount: amt("5") }, { netuid: 64, hotkey: "5A", amount: amt("100") }]);
    expect(q.legs[0]?.kind).toBe("unstakeRoot");
    expect(q.legs[1]?.kind).toBe("sell");
  });
  it("batch order and call args", () => {
    const q = buildAddQuote(ctx, amt("1"), [{ netuid: 64, amount: amt("2") }, { netuid: 51, amount: amt("3") }]);
    const b = buildBatch(q.legs);
    expect(b.method).toBe("batchAll");
    expect(b.calls.map((c) => c.method)).toEqual(["addStake", "addStakeLimit", "addStakeLimit"]);
    expect(b.calls[1]?.args[1]).toBe(51);
    expect(b.calls[1]?.args[4]).toBe(false);
  });
  it("diff flags changed legs and leaves unchanged ones", () => {
    const a = buildAddQuote(ctx, 0n, [{ netuid: 64, amount: amt("10") }, { netuid: 51, amount: amt("10") }]);
    const moved = new Map(pools);
    moved.set(51, pool(51, 2_000, 0.05));
    const b = buildAddQuote({ ...ctx, pools: moved }, 0n, [{ netuid: 64, amount: amt("10") }, { netuid: 51, amount: amt("10") }]);
    const d = diffQuotes(a, b, { diffSlipPts: 0.002, diffOutPct: 0.005 });
    expect(d.find((x) => x.netuid === 51)?.status).toBe("changed");
    expect(d.find((x) => x.netuid === 64)?.status).toBe("same");
    const c = buildAddQuote(ctx, 0n, [{ netuid: 64, amount: amt("10") }]);
    expect(diffQuotes(a, c, { diffSlipPts: 0.002, diffOutPct: 0.005 }).find((x) => x.netuid === 51)?.status).toBe("removed");
  });
});

import { requote, removeLeg } from "@/services/quoteBuilder";
describe("requote", () => {
  it("keeps amounts, refreshes slip, and can drop a leg", () => {
    const a = buildAddQuote(ctx, amt("1"), [{ netuid: 64, amount: amt("10") }]);
    const moved = new Map(pools);
    moved.set(64, pool(64, 1_000, 0.1));
    const b = requote({ ...ctx, pools: moved }, a);
    expect(b.legs.find((l) => l.netuid === 64)!.amountIn).toBe(amt("10"));
    expect(b.legs.find((l) => l.netuid === 64)!.slip).toBeGreaterThan(a.legs.find((l) => l.netuid === 64)!.slip);
    expect(removeLeg(b, 64).legs.map((l) => l.netuid)).toEqual([0]);
  });
});
