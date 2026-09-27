import type { HistoryLeg, HistoryTx } from "./types";

// History presentation logic (pure): titles, grouping, filters, merge of local + indexer.

export type HistoryFilter = "all" | "trade" | "sell" | "transfer";

const ADD = new Set<HistoryLeg["type"]>(["stake", "invest"]);
const REMOVE = new Set<HistoryLeg["type"]>(["sell", "unstake", "unstakeAll"]);
export const isAdd = (l: HistoryLeg) => ADD.has(l.type);
export const isRemove = (l: HistoryLeg) => REMOVE.has(l.type);

/** Sections shown when a card is opened, in this order. */
export const SECTIONS = ["stake", "invest", "sell", "unstake", "unstakeAll", "move", "sendStake", "receiveStake"] as const;
export function groupLegs(tx: HistoryTx): Record<(typeof SECTIONS)[number], HistoryLeg[]> {
  const g = Object.fromEntries(SECTIONS.map((s) => [s, [] as HistoryLeg[]])) as Record<(typeof SECTIONS)[number], HistoryLeg[]>;
  for (const l of tx.legs) g[l.type].push(l);
  return g;
}

export type SummaryKind =
  | "stake" | "invest" | "stakeInvest" | "sell" | "unstake" | "sellUnstake" | "sellAll" | "mixed"
  | "moved" | "sentStake" | "receivedStake" | "validatorChange" | "received" | "sent" | "other";

export type TxSummary = { kind: SummaryKind; taoIn: number; taoOut: number; subnets: number; tokens: number };

export function summarize(tx: HistoryTx): TxSummary {
  const taoIn = tx.legs.filter(isAdd).reduce((s, l) => s + l.tao, 0);
  const taoOut = tx.legs.filter(isRemove).reduce((s, l) => s + l.tao, 0);
  const subnets = new Set(tx.legs.filter((l) => l.netuid !== 0).map((l) => l.netuid)).size;
  const tokens = tx.legs.reduce((s, l) => s + (l.tokens ?? 0), 0);
  const base = { taoIn, taoOut, subnets, tokens };
  if (tx.kind === "transfer" && tx.transfer) {
    const t = tx.transfer;
    return { ...base, kind: t.direction === "in" ? "received" : "sent", taoIn: t.direction === "out" ? t.tao : 0, taoOut: t.direction === "in" ? t.tao : 0 };
  }
  if (tx.kind === "validatorChange") return { ...base, kind: "validatorChange" };
  if (tx.kind === "other" || !tx.legs.length) return { ...base, kind: "other" };
  const types = new Set(tx.legs.map((l) => l.type));
  const only = (...ts: HistoryLeg["type"][]) => [...types].every((t) => ts.includes(t));
  let kind: SummaryKind = "mixed";
  if (only("stake")) kind = "stake";
  else if (only("invest")) kind = "invest";
  else if (only("stake", "invest")) kind = "stakeInvest";
  else if (only("sell")) kind = "sell";
  else if (only("unstake")) kind = "unstake";
  else if (only("sell", "unstake")) kind = "sellUnstake";
  else if (only("unstakeAll", "sell", "unstake")) kind = "sellAll";
  else if (only("move")) kind = "moved";
  else if (only("sendStake")) kind = "sentStake";
  else if (only("receiveStake")) kind = "receivedStake";
  return { ...base, kind };
}

export function matchesFilter(tx: HistoryTx, f: HistoryFilter): boolean {
  if (f === "all") return true;
  if (f === "transfer") return tx.kind === "transfer" || tx.legs.some((l) => l.type === "sendStake" || l.type === "receiveStake");
  if (tx.kind !== "trade") return false;
  return f === "trade" ? tx.legs.some((l) => isAdd(l) || l.type === "move") : tx.legs.some(isRemove);
}

const sameTx = (a: HistoryTx, b: HistoryTx) =>
  (!!a.hash && a.hash === b.hash) || (!!a.extrinsicId && a.extrinsicId === b.extrinsicId) || (a.block != null && a.block === b.block && a.kind === b.kind && b.legs.length > 0);

/**
 * Local log (this browser, instant) + indexer (authoritative, includes failures).
 * When the indexer has the transaction it wins; local entries fill the gap until then.
 */
export function mergeHistory(local: HistoryTx[], remote: HistoryTx[]): HistoryTx[] {
  const out = [...remote];
  for (const l of local) if (!remote.some((r) => sameTx(l, r))) out.push(l);
  return out.sort((a, b) => b.time.localeCompare(a.time));
}
