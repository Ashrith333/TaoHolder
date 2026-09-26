import { describe, expect, it } from "vitest";
import { impactLevel, quoteBuy, quoteRoot, quoteSell } from "@/services/quote";
import { parseTao, raoToTao } from "@/services/rao";
import { cfg, pool } from "../fixtures/pools";

describe("quote", () => {
  const p = pool(64, 10_000, 0.1); // 10k TAO, 100k alpha
  it("buy matches constant-product maths", () => {
    const q = quoteBuy(parseTao("100")!, p, 0.005);
    const x = 100 * (1 - 0.0005);
    const expectedOut = (100_000 * x) / (10_000 + x);
    expect(raoToTao(q.estOut)).toBeCloseTo(expectedOut, 4);
    expect(q.slip).toBeGreaterThan(0.0095);
    expect(q.slip).toBeLessThan(0.0106);
    expect(q.poolShare).toBeCloseTo(0.01, 6);
    expect(q.limitPrice).toBeGreaterThan(0n);
  });
  it("sell matches constant-product maths", () => {
    const q = quoteSell(parseTao("1000")!, p, 0.005);
    const x = 1000 * (1 - 0.0005);
    expect(raoToTao(q.estOut)).toBeCloseTo((10_000 * x) / (100_000 + x), 4);
    expect(q.slip).toBeGreaterThan(0);
  });
  it("root is 1:1", () => {
    expect(quoteRoot(5n).estOut).toBe(5n);
  });
  it("impact levels", () => {
    expect(impactLevel(0.001, 0, cfg)).toBe("low");
    expect(impactLevel(0.01, 0, cfg)).toBe("medium");
    expect(impactLevel(0.03, 0, cfg)).toBe("high");
    expect(impactLevel(0.001, 0.05, cfg)).toBe("high");
  });
});
