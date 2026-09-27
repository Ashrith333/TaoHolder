import type { HistoryLeg, HistoryTx } from "./types";

// History presentation logic (pure): merge local + indexer, group legs, plain-language titles.

export type HistoryFilter = "all" | "trade" | "sell" | "transfer";

export const isAdd = (l: HistoryLeg) => l.type === "stake" || l.type === "invest";
export const isRemove = (l: HistoryLeg) => l.type === "sell" || l.type === "unstake";

/** Stake (root) and Invest (subnets) as separate groups, plus Sell and Unstake. */
export function groupLegs(tx: HistoryTx) {
  const by = (t: HistoryLeg["type"]) => tx.legs.filter((l) => l.type === t);
  return { stake: by("stake"), invest: by("invest"), sell: by("sell"), unstake: by("unstake") };
}

export type TxSummary = {
  kind: "stake" | "invest" | "stakeInvest" | "sell" | "unstake" | "sellUnstake" | "mixed" | "received" | "sent";
  taoIn: number; // TAO that left the wallet
  taoOut: number; // TAO that came back
  subnets: number;
};

export function summarize(tx: HistoryTx): TxSummary {
  if (tx.kind === "transfer" && tx.transfer) {
    const t = tx.transfer;
    return { kind: t.direction === "in" ? "received" : "sent", taoIn: t.direction === "out" ? t.tao : 0, taoOut: t.direction === "in" ? t.tao : 0, subnets: 0 };
  }
  const g = groupLegs(tx);
  const taoIn = tx.legs.filter(isAdd).reduce((s, l) => s + l.tao, 0);
  const taoOut = tx.legs.filter(isRemove).reduce((s, l) => s + l.tao, 0);
  const subnets = new Set(tx.legs.filter((l) => l.type === "invest" || l.type === "sell").map((l) => l.netuid)).size;
  const adds = g.stake.length > 0 || g.invest.length > 0;
  const removes = g.sell.length > 0 || g.unstake.length > 0;
  let kind: TxSummary["kind"];
  if (adds && removes) kind = "mixed";
  else if (adds) kind = g.stake.length && g.invest.length ? "stakeInvest" : g.stake.length ? "stake" : "invest";
  else kind = g.sell.length && g.unstake.length ? "sellUnstake" : g.unstake.length ? "unstake" : "sell";
  return { kind, taoIn, taoOut, subnets };
}

export function matchesFilter(tx: HistoryTx, f: HistoryFilter): boolean {
  if (f === "all") return true;
  if (f === "transfer") return tx.kind === "transfer";
  if (tx.kind !== "trade") return false;
  return f === "trade" ? tx.legs.some(isAdd) : tx.legs.some(isRemove);
}

/**
 * Local log (this browser, knows names and failures) + indexer (exact, any device).
 * The same transaction is matched by hash or block: indexer legs win (exact amounts),
 * local keeps status for failures the indexer never sees. Newest first.
 */
export function mergeHistory(local: HistoryTx[], remote: HistoryTx[]): HistoryTx[] {
  const out: HistoryTx[] = [...remote];
  for (const l of local) {
    const i = out.findIndex(
      (r) => r.kind === "trade" && ((l.hash && r.hash === l.hash) || (l.block != null && r.block === l.block && r.legs.length > 0)),
    );
    if (i >= 0) {
      const r = out[i]!;
      out[i] = { ...r, id: l.id, status: "done", hash: l.hash ?? r.hash };
    } else {
      out.push(l);
    }
  }
  return out.sort((a, b) => b.time.localeCompare(a.time));
}
