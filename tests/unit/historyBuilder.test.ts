import { describe, expect, it } from "vitest";
import { buildHistory, toSs58 } from "@/adapters/sources/historyBuilder";
import real from "@content/fixtures/history.json";
import type { HistoryTx } from "@/services/types";

// Real mainnet data for 5FHM…K1T2: every transaction the wallet has, with the expected card.
const ME = real.coldkey;
const txs = buildHistory({ extrinsics: real.extrinsics, stakeEvents: real.stakeEvents, transfers: real.transfers }, ME);
const byId = (id: string) => txs.find((t) => t.id === id) as HistoryTx;
const TAOBOT = "5E2LP6EnZ54m3wS8s1yPvD5c3xo71kQroBw7aUVK32TKeZ5u";

describe("history from real Taostats data (5FHM…K1T2)", () => {
  it("converts hex keys to addresses", () => {
    expect(toSs58("0x8e59b3a00a476ad4ccdfdff9ecc248c164b35113539aff1191bd07dfe6477f54")).toBe(ME);
    expect(toSs58({ __kind: "Id", value: "0x56a9aee6291bd03ab6d36d4d13e2bebae7cd403518066c72fba1b417d6ddd748" })).toBe(TAOBOT);
  });

  it("lists every transaction once, newest first: 13 signed + 3 received transfers + 2 stake received + 1 validator change", () => {
    expect(txs).toHaveLength(19);
    expect(txs[0]!.id).toBe("9160978-0011");
    expect(new Set(txs.map((t) => t.id)).size).toBe(19);
  });

  it("stake + invest in one confirm: exact amounts and tokens from events, fee shown", () => {
    const t = byId("9160978-0011");
    expect(t).toMatchObject({ kind: "trade", status: "done", fee: 0.002479232 });
    expect(t.legs).toEqual([
      expect.objectContaining({ type: "stake", netuid: 0, tao: 0.00375, hotkey: TAOBOT, validatorName: "tao.bot", estimate: false }),
      expect.objectContaining({ type: "invest", netuid: 3, tao: 0.010625, tokens: 0.358966798, validatorName: "tao.bot", estimate: false }),
      expect.objectContaining({ type: "invest", netuid: 64, tao: 0.010625, tokens: 0.154704608, estimate: false }),
    ]);
  });

  it("failed invests appear as failed, with the reason, the fee that was still charged, and the planned subnets", () => {
    for (const id of ["9160959-0026", "9160904-0014"]) {
      const t = byId(id);
      expect(t).toMatchObject({ kind: "trade", status: "failed", reasonCode: "HotKeyAccountNotExists", fee: 0.000867243 });
      expect(t.legs.map((l) => [l.type, l.netuid, l.tao, l.estimate])).toEqual([["invest", 3, 0.01, true], ["invest", 64, 0.01, true]]);
      expect(t.legs[0]!.hotkey).toBe("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"); // the old placeholder
    }
  });

  it("sell: TAO received and tokens sold come from the event", () => {
    expect(byId("9160892-0006").legs).toEqual([
      expect.objectContaining({ type: "sell", netuid: 9, tao: 0.029283023, tokens: 1.156154755, validatorName: "Macrocosmos", estimate: false }),
    ]);
  });

  it("root stake and unstake (single calls, not batches)", () => {
    expect(byId("7314290-0031").legs[0]).toMatchObject({ type: "stake", netuid: 0, tao: 16.39 });
    expect(byId("7733665-0027").legs[0]).toMatchObject({ type: "unstake", netuid: 0, tao: 21.2167007 });
  });

  it("TAO sent (signed) and received (not signed)", () => {
    expect(byId("7733679-0016")).toMatchObject({ kind: "transfer", transfer: { direction: "out", tao: 21.26, counterparty: "5FgXXMg7ZUYtCernho72oauvvdKXYBWQWBVr8WHbhrrYs862" } });
    expect(byId("9160623-0023")).toMatchObject({ kind: "transfer", transfer: { direction: "in", tao: 0.15589445, counterparty: "5Fy6Dpp1VZvTWLAtoMKgq71eiRkkBYj8tscfRyhw7ripdLwZ" } });
    expect(txs.filter((t) => t.kind === "transfer")).toHaveLength(5);
  });

  it("stake another wallet sent to you", () => {
    expect(byId("7581553-0011").legs).toEqual([
      expect.objectContaining({ type: "receiveStake", netuid: 9, tokens: 0.86754233, counterparty: "5CwYcydmDQpbfh2noiaocreofDfoJhp4j8s7vTaErzHvg3yB" }),
    ]);
  });

  it("validator key swap: shown once as a validator change, not as a buy and a sell", () => {
    const t = byId("8929234-0013");
    expect(t.kind).toBe("validatorChange");
    expect(t.legs).toEqual([expect.objectContaining({ type: "move", netuid: 9, tokens: 2.253096336, validatorName: "Macrocosmos", fromHotkey: "5EnpBz2DoMTzMztFSVPSpi8jP2yfGadU6kgZgsjqnfvonMgu" })]);
  });
});

describe("history: cases not in this account yet", () => {
  const ex = (full_name: string, call_args: object, extra: object = {}) => ({ id: "1-1", timestamp: "2026-10-01T00:00:00Z", block_number: 1, hash: "0x1", fee: "1000000", success: true, error: null, full_name, call_args, ...extra });
  const one = (e: object, events: object[] = []) => buildHistory({ extrinsics: [e as never], stakeEvents: events as never[], transfers: [] }, ME)[0]!;

  it("move stake between validators/subnets", () => {
    const t = one(ex("SubtensorModule.move_stake", { originHotkey: TAOBOT, destinationHotkey: "5D9mz4zcxUwAgHoYbZvL56PD2FMDrBtDzdRCd7bBBFqFUrne", originNetuid: 3, destinationNetuid: 64, alphaAmount: "2000000000" }));
    expect(t.legs[0]).toMatchObject({ type: "move", fromNetuid: 3, netuid: 64, tokens: 2, fromHotkey: TAOBOT });
  });
  it("swap stake between subnets and send stake to another wallet", () => {
    expect(one(ex("SubtensorModule.swap_stake", { hotkey: TAOBOT, originNetuid: 3, destinationNetuid: 9, alphaAmount: "1000000000" })).legs[0]).toMatchObject({ type: "move", fromNetuid: 3, netuid: 9 });
    expect(one(ex("SubtensorModule.transfer_stake", { destinationColdkey: "5CwYcydmDQpbfh2noiaocreofDfoJhp4j8s7vTaErzHvg3yB", hotkey: TAOBOT, originNetuid: 9, destinationNetuid: 9, alphaAmount: "1000000000" })).legs[0])
      .toMatchObject({ type: "sendStake", netuid: 9, counterparty: "5CwYcydmDQpbfh2noiaocreofDfoJhp4j8s7vTaErzHvg3yB" });
  });
  it("unstake all: one leg per subnet from the events", () => {
    const t = one(ex("SubtensorModule.unstake_all", { hotkey: TAOBOT }), [
      { extrinsic_id: "1-1", action: "UNDELEGATE", netuid: 3, amount: "500000000", alpha: "9000000000", delegate: { ss58: TAOBOT }, delegate_name: "tao.bot" },
      { extrinsic_id: "1-1", action: "UNDELEGATE", netuid: 64, amount: "300000000", alpha: "4000000000", delegate: { ss58: TAOBOT }, delegate_name: "tao.bot" },
    ]);
    expect(t.legs.map((l) => [l.type, l.netuid, l.tao])).toEqual([["sell", 3, 0.5], ["sell", 64, 0.3]]);
  });
  it("unknown calls are listed as other, never dropped", () => {
    expect(one(ex("Proxy.add_proxy", {}))).toMatchObject({ kind: "other", call: "Proxy.add_proxy" });
  });
});
