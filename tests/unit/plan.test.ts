import { describe, expect, it } from "vitest";
import { buildPlan, leftoverToStake, validatePlan } from "@/services/plan";
import { parseTao } from "@/services/rao";

const amt = (s: string) => parseTao(s)!;
const rows = [{ netuid: 64 }, { netuid: 4 }];
const base = { amount: amt("50"), stakePct: 30, rule: "equal" as const, rows, custom: { unit: "tao" as const, values: {} } };

describe("plan", () => {
  it("both: stake row % on top, invest shares the rest", () => {
    const p = buildPlan({ ...base, modes: { stake: true, invest: true } });
    expect(p.stake).toBe(amt("15"));
    expect(p.legs.map((l) => l.amount)).toEqual([amt("17.5"), amt("17.5")]);
  });
  it("stake only takes 100%", () => {
    const p = buildPlan({ ...base, modes: { stake: true, invest: false } });
    expect(p.stake).toBe(amt("50"));
    expect(p.legs).toEqual([]);
  });
  it("invest only takes 100%", () => {
    const p = buildPlan({ ...base, modes: { stake: false, invest: true } });
    expect(p.stake).toBe(0n);
    expect(p.invest).toBe(amt("50"));
  });
  it("custom shows leftover and blocks review", () => {
    const p = buildPlan({ ...base, rule: "custom", modes: { stake: false, invest: true }, custom: { unit: "tao", values: { "64": "20", "4": "17.6" } } });
    expect(p.leftover).toBe(amt("12.4"));
    expect(validatePlan(p, amt("50"), amt("100"), { stake: false, invest: true }, "custom")).toEqual({ kind: "place", leftover: amt("12.4") });
  });
  it("custom % unit", () => {
    const p = buildPlan({ ...base, rule: "custom", modes: { stake: true, invest: true }, custom: { unit: "pct", values: { root: "50", "64": "25", "4": "25" } } });
    expect(p.leftover).toBe(0n);
  });
  it("leftover moves to stake", () => {
    expect(leftoverToStake({ root: "1" }, "12.4", "tao").root).toBe("13.4");
  });
  it("validates amount and max", () => {
    const p = buildPlan({ ...base, modes: { stake: true, invest: true } });
    expect(validatePlan(p, 0n, amt("100"), { stake: true, invest: true }, "equal")?.kind).toBe("amount");
    expect(validatePlan(p, amt("50"), amt("10"), { stake: true, invest: true }, "equal")?.kind).toBe("max");
  });
});
