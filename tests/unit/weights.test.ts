import { describe, expect, it } from "vitest";
import { revenueRuleAvailable, splitAmount, splitByRule, weightsFor } from "@/services/weights";
import { parseTao, sumRao } from "@/services/rao";
import { pool } from "../fixtures/pools";

describe("weights", () => {
  it("equal split sums exactly with remainder on largest leg", () => {
    const b = parseTao("10")!;
    const a = splitByRule(b, "equal", [{ netuid: 1 }, { netuid: 2 }, { netuid: 3 }]);
    expect(sumRao(a)).toBe(b);
    expect(a[0]).toBe(3_333_333_334n);
  });
  it("n = 1 takes everything", () => {
    expect(splitAmount(123n, [1])).toEqual([123n]);
  });
  it("mkt cap matches PRD 12.1 worked example", () => {
    const scores = [500, 300, 150, 120, 80, 50];
    const rows = scores.map((m, i) => ({ netuid: i + 1, live: pool(i + 1, 1000, 1, { mcapTao: m }) }));
    const a = splitByRule(parseTao("35")!, "mcap", rows);
    expect(sumRao(a)).toBe(parseTao("35")!);
    expect(Number(a[0]) / 1e9).toBeCloseTo(14.58, 2);
    expect(Number(a[5]) / 1e9).toBeCloseTo(1.46, 2);
  });
  it("zero scores fall back to equal", () => {
    expect(weightsFor("revenue", [{ netuid: 1 }, { netuid: 2 }])).toEqual([0.5, 0.5]);
  });
  it("revenue rule needs data on enough rows", () => {
    const f = { revenueSplitRule: true, revenueMinRows: 2 };
    expect(revenueRuleAvailable([{ netuid: 1, revenueUsd: 5 }, { netuid: 2 }], f)).toBe(false);
    expect(revenueRuleAvailable([{ netuid: 1, revenueUsd: 5 }, { netuid: 2, revenueUsd: 1 }], f)).toBe(true);
    expect(revenueRuleAvailable([{ netuid: 1, revenueUsd: 5 }, { netuid: 2, revenueUsd: 1 }], { ...f, revenueSplitRule: false })).toBe(false);
  });
});
