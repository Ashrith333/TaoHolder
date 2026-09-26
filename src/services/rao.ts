import type { Rao } from "./types";

// 1 TAO = 1e9 rao. Subnet tokens (alpha) use the same 9 decimals.
export const RAO = 1_000_000_000n;
const DECIMALS = 9;

/** Parse a user-typed decimal string into rao. Extra decimals are dropped (round down, never up). */
export function parseTao(input: string): Rao | null {
  const s = input.trim().replace(/,/g, "");
  if (!/^\d*(\.\d*)?$/.test(s) || s === "" || s === ".") return null;
  const [whole = "0", frac = ""] = s.split(".");
  const fracPadded = (frac + "0".repeat(DECIMALS)).slice(0, DECIMALS);
  return BigInt(whole || "0") * RAO + BigInt(fracPadded);
}

/** Convert a float TAO value (from APIs/config) to rao, rounding down. */
export function taoToRao(tao: number): Rao {
  if (!Number.isFinite(tao) || tao <= 0) return 0n;
  return parseTao(tao.toFixed(DECIMALS)) ?? 0n;
}

/** Display only. Never feed the result back into amount maths. */
export function raoToTao(rao: Rao): number {
  const whole = rao / RAO;
  const frac = rao % RAO;
  return Number(whole) + Number(frac) / 1e9;
}

/** rao → plain decimal string, trimmed, max `dp` decimals, rounded down. */
export function raoToInput(rao: Rao, dp = 4): string {
  const neg = rao < 0n;
  const abs = neg ? -rao : rao;
  const whole = abs / RAO;
  const frac = (abs % RAO).toString().padStart(DECIMALS, "0").slice(0, dp).replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

/** floor(a * b / c) */
export function mulDiv(a: bigint, b: bigint, c: bigint): bigint {
  if (c === 0n) return 0n;
  return (a * b) / c;
}

/** Parts-per-billion from a float ratio, for exact bigint scaling. */
export function ppb(ratio: number): bigint {
  return BigInt(Math.round(ratio * 1e9));
}

/** floor(amount * pct / 100) with pct as a float (e.g. 30 or 12.5). */
export function pctOf(amount: Rao, pct: number): Rao {
  return mulDiv(amount, ppb(pct / 100), RAO);
}

export const minRao = (a: Rao, b: Rao) => (a < b ? a : b);
export const maxRao = (a: Rao, b: Rao) => (a > b ? a : b);
export const sumRao = (xs: Rao[]) => xs.reduce((s, x) => s + x, 0n);
