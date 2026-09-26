import { describe, expect, it } from "vitest";
import { maxSpendable, runGuards } from "@/services/guards";
import { parseTao } from "@/services/rao";
import { splitByRule } from "@/services/weights";
import { cfg, pool } from "../fixtures/pools";

const pools = new Map([
  [64, pool(64, 98_000, 0.1)],
  [4, pool(4, 40_000, 0.07)],
  [56, pool(56, 640, 0.03)],
  [9, pool(9, 7000, 0.02, { emissionOn: false })],
]);
const amt = (s: string) => parseTao(s)!;

describe("guards", () => {
  it("skips emission off, thin pool, no validator, dust", () => {
    const r = runGuards({
      rows: [{ netuid: 64, amount: amt("10") }, { netuid: 9, amount: amt("10") }, { netuid: 56, amount: amt("10") }, { netuid: 4, amount: amt("0.001") }],
      pools,
      hasValidator: () => true,
      cfg,
    });
    expect(r.kept.map((k) => k.netuid)).toEqual([64]);
    expect(r.skipped.map((s) => s.reason).sort()).toEqual(["emissionOff", "thinPool", "tooSmall"]);
  });
  it("no validator skip", () => {
    const r = runGuards({ rows: [{ netuid: 64, amount: amt("1") }], pools, hasValidator: () => false, cfg });
    expect(r.skipped[0]?.reason).toBe("noValidator");
  });
  it("re-weights remaining rows after a skip", () => {
    const b = amt("30");
    const split = (ns: number[]) => splitByRule(b, "equal", ns.map((netuid) => ({ netuid })));
    const r = runGuards({
      rows: [64, 4, 56].map((n, i) => ({ netuid: n, amount: split([64, 4, 56])[i]! })),
      pools,
      hasValidator: () => true,
      cfg,
      reweight: split,
    });
    expect(r.kept.map((k) => k.amount)).toEqual([amt("15"), amt("15")]);
  });
  it("all skipped", () => {
    const r = runGuards({ rows: [{ netuid: 56, amount: amt("1") }], pools, hasValidator: () => true, cfg, reweight: () => [] });
    expect(r.kept).toEqual([]);
  });
  it("max spendable keeps the fee buffer", () => {
    expect(maxSpendable(amt("1"), 0.08)).toBe(amt("0.92"));
    expect(maxSpendable(amt("0.01"), 0.08)).toBe(0n);
  });
});
