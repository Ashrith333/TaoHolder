import { parseTao, pctOf, sumRao } from "./rao";
import { splitByRule, type SplitRule, type WeightRow } from "./weights";
import type { Rao } from "./types";

// Stake & Invest allocation on one page (D11, PRD 9.3/9.4/12).
export type Modes = { stake: boolean; invest: boolean };
export type CustomUnit = "tao" | "pct";
export const ROOT_KEY = "root";

export type PlanInput = {
  amount: Rao;
  modes: Modes;
  stakePct: number;
  rule: SplitRule;
  rows: WeightRow[]; // ticked subnets, in display order
  custom: { unit: CustomUnit; values: Record<string, string> };
};

export type Plan = {
  stake: Rao;
  invest: Rao;
  legs: { netuid: number; amount: Rao }[];
  placed: Rao;
  leftover: Rao; // only non-zero in Custom
};

function customValue(raw: string | undefined, unit: CustomUnit, amount: Rao): Rao {
  if (!raw) return 0n;
  if (unit === "tao") return parseTao(raw) ?? 0n;
  const pct = Number(raw);
  return Number.isFinite(pct) && pct > 0 ? pctOf(amount, pct) : 0n;
}

export function buildPlan(p: PlanInput): Plan {
  const { amount, modes } = p;
  if (p.rule === "custom") {
    const stake = modes.stake ? customValue(p.custom.values[ROOT_KEY], p.custom.unit, amount) : 0n;
    const legs = modes.invest
      ? p.rows.map((r) => ({ netuid: r.netuid, amount: customValue(p.custom.values[String(r.netuid)], p.custom.unit, amount) }))
      : [];
    const invest = sumRao(legs.map((l) => l.amount));
    const placed = stake + invest;
    return { stake, invest, legs, placed, leftover: amount - placed };
  }
  const stakeShare = modes.stake && modes.invest ? p.stakePct : modes.stake ? 100 : 0;
  const stake = modes.invest ? pctOf(amount, stakeShare) : amount;
  const invest = modes.invest ? amount - stake : 0n;
  const amounts = modes.invest ? splitByRule(invest, p.rule, p.rows) : [];
  const legs = p.rows.map((r, i) => ({ netuid: r.netuid, amount: amounts[i] ?? 0n }));
  return { stake: modes.stake ? stake : 0n, invest, legs: modes.invest ? legs : [], placed: amount, leftover: 0n };
}

/** Ticking Stake while leftover exists moves the leftover into the Stake row (PRD 9.4). */
export function leftoverToStake(values: Record<string, string>, leftoverInput: string, unit: CustomUnit): Record<string, string> {
  const current = Number(values[ROOT_KEY] ?? "0") || 0;
  const add = Number(leftoverInput) || 0;
  const next = current + add;
  return { ...values, [ROOT_KEY]: unit === "pct" ? String(+next.toFixed(2)) : String(+next.toFixed(4)) };
}

export type PlanIssue =
  | { kind: "amount" }
  | { kind: "max"; max: Rao }
  | { kind: "place"; leftover: Rao }
  | { kind: "select" };

export function validatePlan(plan: Plan, amount: Rao, max: Rao, modes: Modes, rule: SplitRule): PlanIssue | null {
  if (amount <= 0n) return { kind: "amount" };
  if (amount > max) return { kind: "max", max };
  if (modes.invest && plan.legs.length === 0) return { kind: "select" };
  if (rule === "custom" && plan.leftover !== 0n) return { kind: "place", leftover: plan.leftover };
  return null;
}
