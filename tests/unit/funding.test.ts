import { afterEach, describe, expect, it, vi } from "vitest";
import { erc20TransferData, toBaseUnits } from "@/services/funding/evm";
import { changenow, mapChangenowStatus } from "@/adapters/funding/changenow";
import { demo } from "@/adapters/funding/demo";
import { forevermoney } from "@/adapters/funding/forevermoney";

const asset = { id: "eth:eth", symbol: "ETH", network: "eth", label: "ETH on Ethereum", evmChainId: 1, decimals: 18 };
const cnCfg = { id: "changenow", kind: "swap-service" as const, name: "ChangeNOW", enabled: true, networks: ["mainnet" as const], custodial: true,
  config: { baseUrl: "https://api.changenow.io/v2", apiKeyEnv: "CHANGENOW_API_KEY", taoCurrency: "tao", taoNetwork: "tao", flow: "standard", trackUrl: "https://changenow.io/exchange/txs/{id}" } };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("EVM deposit helpers", () => {
  it("converts amounts exactly and encodes ERC-20 transfers", () => {
    expect(toBaseUnits("0.1", 18)).toBe(100000000000000000n);
    expect(toBaseUnits("25.5", 6)).toBe(25500000n);
    expect(toBaseUnits("1.1234567", 6)).toBe(1123456n); // rounds down
    expect(erc20TransferData("0x000000000000000000000000000000000000dEaD", 1000000n)).toBe(
      "0xa9059cbb000000000000000000000000000000000000000000000000000000000000dead00000000000000000000000000000000000000000000000000000000000f4240",
    );
  });
});

describe("ChangeNOW provider", () => {
  it("maps every status to a plain state", () => {
    expect(["new", "waiting", "confirming", "exchanging", "sending", "finished", "failed", "refunded", "expired"].map(mapChangenowStatus)).toEqual(
      ["awaitingDeposit", "awaitingDeposit", "confirming", "converting", "sending", "done", "failed", "refunded", "expired"],
    );
  });

  it("quotes and creates an order that pays TAO to the SS58 address", async () => {
    vi.stubEnv("CHANGENOW_API_KEY", "k");
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("/min-amount")) return Response.json({ minAmount: 0.005 });
      if (url.includes("/estimated-amount")) return Response.json({ toAmount: 1.21, transactionSpeedForecast: "10-60", validUntil: "x" });
      if (url.endsWith("/exchange")) return Response.json({ id: "abc123", payinAddress: "0x1111111111111111111111111111111111111111", toAmount: 1.2 });
      return Response.json({ status: "finished", amountTo: 1.19, payoutHash: "0xpay" });
    });
    const p = changenow(cnCfg);
    const q = await p.quote(asset, 0.1);
    expect(q).toMatchObject({ taoOut: 1.21, minAmountIn: 0.005, etaMinutes: 60 });
    expect(calls[1]!.url).toContain("fromCurrency=eth&fromNetwork=eth&toCurrency=tao&toNetwork=tao");
    expect((calls[1]!.init?.headers as Record<string, string>)["x-changenow-api-key"]).toBe("k");

    const o = await p.create(asset, 0.1, "5FHMJa4U21RZPYQsnC5u4tStFFHGnKfZvrhvKkLWxHk2K1T2");
    expect(JSON.parse(String(calls[2]!.init?.body))).toMatchObject({ address: "5FHMJa4U21RZPYQsnC5u4tStFFHGnKfZvrhvKkLWxHk2K1T2", fromAmount: "0.1" });
    expect(o).toMatchObject({ id: "abc123", state: "awaitingDeposit", trackUrl: "https://changenow.io/exchange/txs/abc123" });
    expect(o.steps[0]).toMatchObject({ type: "send", to: "0x1111111111111111111111111111111111111111", amount: 0.1 });
    expect(await p.status("abc123")).toMatchObject({ state: "done", taoReceived: 1.19 });
  });

  it("refuses below the minimum and without an API key", async () => {
    vi.stubEnv("CHANGENOW_API_KEY", "k");
    vi.stubGlobal("fetch", async (url: string) => (url.includes("/min-amount") ? Response.json({ minAmount: 0.05 }) : Response.json({ toAmount: 0.1 })));
    await expect(changenow(cnCfg).quote(asset, 0.01)).rejects.toMatchObject({ code: "belowMin" });
    vi.stubEnv("CHANGENOW_API_KEY", "");
    await expect(changenow(cnCfg).quote(asset, 0.1)).rejects.toMatchObject({ code: "notReady" });
  });
});

describe("other providers", () => {
  it("demo advances to done and pays the quoted TAO", async () => {
    const d = demo({ ...cnCfg, id: "demo" });
    const o = await d.create(asset, 1, "demo-x");
    expect(await d.status(o.id)).toMatchObject({ state: "awaitingDeposit" });
    expect(await d.status(o.id, { sentAt: Date.now() - 9000 })).toMatchObject({ state: "done", taoReceived: o.taoExpected });
    expect(await d.status(o.id, { sentAt: Date.now() - 4500 })).toMatchObject({ state: "converting" });
  });
  it("ForeverMoney refuses until verified (no funds can move)", async () => {
    const f = forevermoney({ ...cnCfg, id: "forevermoney", config: { sourceChains: { base: { chainId: 8453 } } } });
    expect(f.supports({ ...asset, network: "base" })).toBe(true);
    await expect(f.create({ ...asset, network: "base" }, 1, "x")).rejects.toMatchObject({ code: "notReady" });
  });
});
