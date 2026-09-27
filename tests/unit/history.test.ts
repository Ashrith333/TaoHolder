import { describe, expect, it } from "vitest";
import { groupLegs, matchesFilter, mergeHistory, summarize } from "@/services/history";
import type { HistoryTx } from "@/services/types";

const trade = (over: Partial<HistoryTx>): HistoryTx => ({ id: "x", kind: "trade", time: "2026-09-27T10:00:00Z", status: "done", legs: [], ...over });

describe("history", () => {
  const mixed = trade({
    legs: [
      { type: "stake", netuid: 0, tao: 1 },
      { type: "invest", netuid: 64, tao: 0.5, tokens: 7 },
      { type: "invest", netuid: 9, tao: 0.5, tokens: 20 },
    ],
  });

  it("groups stake and invest separately and titles the transaction", () => {
    const g = groupLegs(mixed);
    expect(g.stake).toHaveLength(1);
    expect(g.invest.map((l) => l.netuid)).toEqual([64, 9]);
    expect(summarize(mixed)).toEqual({ kind: "stakeInvest", taoIn: 2, taoOut: 0, subnets: 2 });
  });

  it("sell and transfer summaries", () => {
    expect(summarize(trade({ legs: [{ type: "sell", netuid: 51, tao: 1.2, tokens: 30 }] })).kind).toBe("sell");
    expect(summarize({ ...trade({}), kind: "transfer", transfer: { direction: "in", tao: 5, counterparty: "5A" } })).toMatchObject({ kind: "received", taoOut: 5 });
  });

  it("filters", () => {
    const sell = trade({ legs: [{ type: "sell", netuid: 51, tao: 1 }] });
    const xfer = { ...trade({}), kind: "transfer" as const, transfer: { direction: "out" as const, tao: 1, counterparty: "5B" } };
    expect([mixed, sell, xfer].filter((t) => matchesFilter(t, "trade"))).toEqual([mixed]);
    expect([mixed, sell, xfer].filter((t) => matchesFilter(t, "sell"))).toEqual([sell]);
    expect([mixed, sell, xfer].filter((t) => matchesFilter(t, "transfer"))).toEqual([xfer]);
  });

  it("merges a local trade with the indexer copy by block; keeps local-only failures", () => {
    const local = [
      trade({ id: "L1", block: 100, status: "pending", legs: [{ type: "invest", netuid: 64, tao: 1, estimate: true }] }),
      trade({ id: "L2", time: "2026-09-27T11:00:00Z", status: "failed", reason: "Price moved", legs: [{ type: "invest", netuid: 4, tao: 1, estimate: true }] }),
    ];
    const remote = [trade({ id: "R1", block: 100, hash: "100-3", legs: [{ type: "invest", netuid: 64, tao: 1, tokens: 14.2 }] })];
    const m = mergeHistory(local, remote);
    expect(m).toHaveLength(2);
    expect(m[0]).toMatchObject({ id: "L2", status: "failed" });
    expect(m[1]).toMatchObject({ id: "L1", status: "done", legs: [{ tokens: 14.2 }] });
  });
});
