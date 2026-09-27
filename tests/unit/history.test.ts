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
    expect(summarize(mixed)).toMatchObject({ kind: "stakeInvest", taoIn: 2, taoOut: 0, subnets: 2 });
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

  it("indexer copy wins (matched by hash); local-only entries stay until indexed", () => {
    const local = [
      trade({ id: "L1", hash: "0xabc", status: "pending", legs: [{ type: "invest", netuid: 64, tao: 1, estimate: true }] }),
      trade({ id: "L2", time: "2026-09-27T11:00:00Z", status: "failed", reason: "Price moved", legs: [{ type: "invest", netuid: 4, tao: 1, estimate: true }] }),
    ];
    const remote = [trade({ id: "100-3", hash: "0xabc", status: "failed", reasonCode: "SlippageTooHigh", legs: [{ type: "invest", netuid: 64, tao: 1, estimate: true }] })];
    const m = mergeHistory(local, remote);
    expect(m.map((t) => t.id)).toEqual(["L2", "100-3"]);
    expect(m[1]).toMatchObject({ status: "failed", reasonCode: "SlippageTooHigh" });
  });
  it("titles for moves, stake received, validator changes and unknown calls", () => {
    expect(summarize(trade({ legs: [{ type: "move", netuid: 64, fromNetuid: 3, tao: 0, tokens: 2 }] })).kind).toBe("moved");
    expect(summarize(trade({ legs: [{ type: "receiveStake", netuid: 9, tao: 0.02, tokens: 0.8 }] })).kind).toBe("receivedStake");
    expect(summarize({ ...trade({}), kind: "validatorChange", legs: [{ type: "move", netuid: 9, tao: 0 }] }).kind).toBe("validatorChange");
    expect(summarize({ ...trade({}), kind: "other", call: "Proxy.add_proxy" }).kind).toBe("other");
  });
});
