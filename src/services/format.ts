import { raoToTao } from "./rao";
import type { Rao } from "./types";

// Number formatting rules (PRD 8.5).
const grouped = (n: number, dp: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

function floorTo(n: number, dp: number) {
  const f = 10 ** dp;
  return Math.floor(n * f + 1e-9) / f;
}

export function formatTaoNumber(tao: number): string {
  const abs = Math.abs(tao);
  const dp = abs >= 1 || abs === 0 ? 2 : 4;
  return grouped(floorTo(tao, dp), dp);
}

export const formatTao = (tao: number) => `${formatTaoNumber(tao)} TAO`;
export const formatRao = (rao: Rao) => formatTao(raoToTao(rao));

export function formatUsd(usd: number): string {
  const dp = Math.abs(usd) >= 1000 ? 0 : 2;
  return `$${grouped(usd, dp)}`;
}

/** Subnet tokens: 1 decimal, or 4 below 1 so small amounts don't read as 0.3 / 0.0. */
export const formatTokens = (alpha: number) => (Math.abs(alpha) < 1 ? grouped(floorTo(alpha, 4), 4) : grouped(floorTo(alpha, 1), 1));
export const formatPrice = (priceTao: number) => `${priceTao.toFixed(3)} τ`;
export const formatPct = (ratio: number, dp = 1) => `${(ratio * 100).toFixed(dp)}%`;

/** ▲ +6.1% / ▼ -1.8%. Input is already a percentage number. */
export function formatChange(pct: number): { text: string; up: boolean } {
  const up = pct >= 0;
  return { text: `${up ? "▲ +" : "▼ -"}${Math.abs(pct).toFixed(1)}%`, up };
}

export function shortAddress(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr;
}

/** Currency pair ordered by the user's setting (D5). */
export function currencyPair(tao: number, usdPerTao: number | null, first: "tao" | "usd") {
  const taoText = formatTao(tao);
  if (usdPerTao == null) return { primary: taoText, secondary: null };
  const usdText = formatUsd(tao * usdPerTao);
  return first === "tao"
    ? { primary: taoText, secondary: `≈ ${usdText}` }
    : { primary: usdText, secondary: `≈ ${taoText}` };
}

/** Fill {placeholders} in a copy string. */
export function fill(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{([\w:]+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function amountBucket(tao: number, edges: number[]): string {
  const [a = 1, b = 10, c = 100] = edges;
  if (tao < a) return `under ${a}`;
  if (tao < b) return `${a} to ${b}`;
  if (tao < c) return `${b} to ${c}`;
  return `over ${c}`;
}
