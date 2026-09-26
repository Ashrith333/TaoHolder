import { alphaValue, taoToAlpha } from "./quote";
import { mulDiv, parseTao, ppb, RAO, taoToRao } from "./rao";
import type { Rao, SubnetLive } from "./types";

// Sell amounts per position (PRD 9.8). Subnet amounts are alpha; root amounts are rao.
export type SellPick = { value: string; unit: "tao" | "pct" };
export type SellLine = { amount: Rao; sellTao: Rao; staysTao: Rao; all: boolean; dustSnapped: boolean };

export function sellLine(held: Rao, pick: SellPick | undefined, pool: SubnetLive | null, dustTao: number): SellLine {
  const heldTao = pool ? alphaValue(held, pool) : held;
  if (!pick || !pick.value) return { amount: 0n, sellTao: 0n, staysTao: heldTao, all: false, dustSnapped: false };
  let amount: Rao;
  if (pick.unit === "pct") {
    const pct = Math.min(100, Math.max(0, Number(pick.value) || 0));
    amount = pct >= 100 ? held : mulDiv(held, ppb(pct / 100), RAO);
  } else {
    const tao = parseTao(pick.value) ?? 0n;
    amount = pool ? taoToAlpha(tao, pool) : tao;
  }
  if (amount > held) amount = held;
  const stays = held - amount;
  const staysTao = pool ? alphaValue(stays, pool) : stays;
  const dustSnapped = amount > 0n && stays > 0n && staysTao < taoToRao(dustTao);
  if (dustSnapped) amount = held;
  const all = amount === held && amount > 0n;
  return {
    amount,
    sellTao: pool ? alphaValue(amount, pool) : amount,
    staysTao: all ? 0n : staysTao,
    all,
    dustSnapped,
  };
}
