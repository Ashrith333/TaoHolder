import { describe, expect, it } from "vitest";
import { sellLine } from "@/services/sell";
import { makeAddQuote } from "@/services/tradeQuote";
import { parseTao, raoToTao } from "@/services/rao";
import { cfg, pool, validators } from "../fixtures/pools";

const amt = (s: string) => parseTao(s)!;
const p = pool(64, 10_000, 0.1);

describe("sell", () => {
  it("half by pct leaves the other half", () => {
    const l = sellLine(amt("742"), { value: "50", unit: "pct" }, p, 0.002);
    expect(l.amount).toBe(amt("371"));
    expect(raoToTao(l.staysTao)).toBeCloseTo(37.1, 6);
  });
  it("dust rule snaps to all", () => {
    const l = sellLine(amt("100"), { value: "9.9999", unit: "tao" }, p, 0.002);
    expect(l.dustSnapped).toBe(true);
    expect(l.all).toBe(true);
  });
  it("root is TAO 1:1", () => {
    const l = sellLine(amt("10"), { value: "4", unit: "tao" }, null, 0.002);
    expect(l.amount).toBe(amt("4"));
    expect(l.staysTao).toBe(amt("6"));
  });
});

describe("makeAddQuote", () => {
  it("re-weights after a skip so the bucket is fully placed", () => {
    const pools = new Map([[64, pool(64, 98_000, 0.1)], [56, pool(56, 640, 0.03)]]);
    const q = makeAddQuote({ pools, validators, cfg, now: 0, id: "x" }, {
      amount: amt("50"), modes: { stake: true, invest: true }, stakePct: 30, rule: "equal",
      rows: [{ netuid: 64 }, { netuid: 56 }], custom: { unit: "tao", values: {} },
    });
    expect(q.skipped).toEqual([{ netuid: 56, reason: "thinPool" }]);
    expect(q.legs.find((l) => l.netuid === 64)?.amountIn).toBe(amt("35"));
  });
});
