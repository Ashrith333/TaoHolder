import { describe, expect, it, vi } from "vitest";

// Mock the chain: dynamic info for 2 subnets, one coldkey with root + subnet stake.
vi.mock("@polkadot/api", () => {
  const api = {
    isConnected: true,
    call: {
      subnetInfoRuntimeApi: {
        getAllDynamicInfo: async () => ({
          toJSON: () => [
            { netuid: 0, taoIn: 0, alphaIn: 0, alphaOut: 0, taoInEmission: 0 },
            { netuid: 64, taoIn: "0x" + (98_000n * 10n ** 9n).toString(16), alphaIn: 860_000n * 10n ** 9n + "", alphaOut: 140_000n * 10n ** 9n + "", taoInEmission: 3000 },
            null,
            { netuid: 4, taoIn: 40_000 * 1e9, alphaIn: 560_000 * 1e9, alphaOut: 0, taoInEmission: 1000 },
          ],
        }),
      },
      stakeInfoRuntimeApi: {
        getStakeInfoForColdkey: async () => ({
          toJSON: () => [
            { hotkey: "5A", netuid: 0, stake: 10 * 1e9 },
            { hotkey: "5A", netuid: 64, stake: 100 * 1e9 },
            { hotkey: "5A", netuid: 64, stake: 50 * 1e9 },
            { hotkey: "5B", netuid: 4, stake: 0 },
          ],
        }),
      },
    },
    query: { system: { account: async () => ({ data: { free: { toBigInt: () => 7n * 10n ** 9n } } }) } },
  };
  return { ApiPromise: { create: async () => api }, WsProvider: class { disconnect = async () => {}; } };
});

const { subtensor } = await import("@/adapters/sources/subtensor");
const src = { id: "chain", kind: "pools" as const, provider: "subtensor", network: "mainnet" as const, priority: 5, enabled: true, url: "wss://x", config: {} };

describe("subtensor provider", () => {
  it("maps dynamic info to pools (price, reserves, emission share, mcap)", async () => {
    const pools = await subtensor.pools!(src).pools();
    expect(pools.map((p) => p.netuid)).toEqual([64, 4]);
    const p = pools[0]!;
    expect(p.taoReserve).toBe(98_000n * 10n ** 9n);
    expect(p.priceTao).toBeCloseTo(98_000 / 860_000, 6);
    expect(p.emissionShare).toBeCloseTo(0.75, 6);
    expect(p.mcapTao).toBeCloseTo((98_000 / 860_000) * 1_000_000, 0);
  });
  it("maps stake info to positions, merging duplicates and dropping zero stake", async () => {
    const r = await subtensor.positions!({ ...src, kind: "positions" }).positions("5Cold");
    expect(r.free).toBe(7n * 10n ** 9n);
    expect(r.root).toBe(10n * 10n ** 9n);
    expect(r.positions).toEqual([{ netuid: 64, hotkey: "5A", alpha: 150n * 10n ** 9n, change7d: 0 }]);
  });
});
