import { describe, expect, it } from "vitest";
import { initialTx, txReducer, type TxEvent, type TxState } from "@/services/txMachine";
import { resolveBucket } from "@/services/buckets";
import { permitsFrom, resolveValidator } from "@/services/validators";
import { validators } from "../fixtures/pools";

const run = (events: TxEvent[]) => events.reduce<TxState>((s, e) => txReducer(s, e), initialTx);

describe("tx machine", () => {
  it("happy path", () => {
    const s = run([{ t: "QUOTE" }, { t: "QUOTED" }, { t: "CONFIRM" }, { t: "SUBMITTED", hash: "0x1" }, { t: "IN_BLOCK", block: 7 }, { t: "FINALIZED" }]);
    expect(s).toEqual({ s: "finalized", hash: "0x1", block: 7 });
  });
  it("reject and price-limit failure", () => {
    expect(run([{ t: "QUOTE" }, { t: "QUOTED" }, { t: "CONFIRM" }, { t: "REJECT" }]).s).toBe("rejectedByUser");
    const f = run([{ t: "QUOTE" }, { t: "QUOTED" }, { t: "CONFIRM" }, { t: "SUBMITTED", hash: "h" }, { t: "FAIL", reason: "SlippageTooHigh", priceLimit: true }]);
    expect(f.s).toBe("failedOnChain");
    expect(txReducer(txReducer(f, { t: "QUOTE" }), { t: "REQUOTED" }).s).toBe("requoteReady");
  });
  it("drop after no block", () => {
    expect(run([{ t: "QUOTE" }, { t: "QUOTED" }, { t: "CONFIRM" }, { t: "SUBMITTED", hash: "h" }, { t: "DROP" }]).s).toBe("dropped");
  });
});

describe("buckets + validators", () => {
  const rows = [
    { netuid: 64, layer: "inference" as const },
    { netuid: 51, layer: "compute" as const },
    { netuid: 8, layer: "other" as const },
  ];
  const defs = {
    core: { label: "Core", type: "list" as const, netuids: [64, 99] },
    compute: { label: "Compute", type: "rule" as const, layer: "compute" },
    other: { label: "Other", type: "rule" as const, layerNot: ["compute", "inference"] },
  };
  it("resolves list, rule and bookmarks", () => {
    expect(resolveBucket("core", defs, rows, [])).toEqual([64]);
    expect(resolveBucket("compute", defs, rows, [])).toEqual([51]);
    expect(resolveBucket("other", defs, rows, [])).toEqual([8]);
    expect(resolveBucket("bookmarks", defs, rows, [51])).toEqual([51]);
    expect(resolveBucket("all", defs, rows, [], [8])).toEqual([64, 51]);
  });
  it("per-subnet first, then the shared chain; take and permits skip entries", () => {
    expect(resolveValidator(4, validators)?.name).toBe("B");
    expect(resolveValidator(64, validators)?.name).toBe("A");
    const hiTake = { ...validators, perNetuid: { "4": [{ name: "X", hotkey: "5X", take: 0.5 }] } };
    expect(resolveValidator(4, hiTake)?.name).toBe("A");
    expect(resolveValidator(64, validators, (hk) => hk !== "5A")?.name).toBe("C");
    expect(resolveValidator(4, validators, () => false)).toBeNull();
  });
  it("permits from pools: unknown list allows, known list filters, root always allowed", () => {
    const pools = new Map([[51, { permits: ["5C"] }], [64, {}]]);
    const ok = permitsFrom(pools);
    expect(ok("5A", 64)).toBe(true);
    expect(ok("5A", 51)).toBe(false);
    expect(ok("5C", 51)).toBe(true);
    expect(ok("5A", 0)).toBe(true);
  });
});

describe("retry after a non-price-limit failure", () => {
  it("allows Confirm again, but not after a price-limit failure", () => {
    const failed = run([{ t: "QUOTE" }, { t: "QUOTED" }, { t: "CONFIRM" }, { t: "FAIL", reason: "x", priceLimit: false }]);
    expect(txReducer(failed, { t: "CONFIRM" }).s).toBe("awaitingSignature");
    const limit = run([{ t: "QUOTE" }, { t: "QUOTED" }, { t: "CONFIRM" }, { t: "FAIL", reason: "x", priceLimit: true }]);
    expect(txReducer(limit, { t: "CONFIRM" }).s).toBe("failedOnChain");
  });
});
