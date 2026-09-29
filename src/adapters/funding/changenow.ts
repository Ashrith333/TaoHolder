import "server-only";
import type { FundingAsset, FundingOrder, FundingOrderState } from "@/services/funding/types";
import { FundingError, type FundingAdapter, type ProviderConfig, type StatusUpdate } from "./types";

// ChangeNOW API v2 (https://documenter.getpostman.com/view/8180765/SVfTPnM8 — "v2"):
//   GET  /exchange/min-amount, /exchange/estimated-amount, /exchange/by-id
//   POST /exchange  → payinAddress to send to; TAO is paid out to `address` (the SS58).
// Currency/network codes and base URL come from config so they can be fixed without a deploy.

const STATE: Record<string, FundingOrderState> = {
  new: "awaitingDeposit", waiting: "awaitingDeposit", confirming: "confirming", exchanging: "converting",
  sending: "sending", finished: "done", failed: "failed", refunded: "refunded", verifying: "converting", expired: "expired",
};
export const mapChangenowStatus = (s: string): FundingOrderState => STATE[s] ?? "converting";

export function changenow(p: ProviderConfig): FundingAdapter {
  const c = p.config as Record<string, string>;
  const base = c.baseUrl ?? "https://api.changenow.io/v2";
  const key = () => {
    const k = process.env[c.apiKeyEnv ?? "CHANGENOW_API_KEY"];
    if (!k) throw new FundingError("notReady", "ChangeNOW API key is not set");
    return k;
  };
  const pair = (a: FundingAsset) => ({
    fromCurrency: a.symbol.toLowerCase(), fromNetwork: a.network, toCurrency: c.taoCurrency ?? "tao", toNetwork: c.taoNetwork ?? "tao", flow: c.flow ?? "standard",
  });
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { "content-type": "application/json", "x-changenow-api-key": key(), ...(init?.headers ?? {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new FundingError("provider", String(body.message ?? body.error ?? `ChangeNOW HTTP ${res.status}`));
    return body as T;
  }
  const qs = (o: Record<string, string | number>) => new URLSearchParams(Object.entries(o).map(([k, v]) => [k, String(v)])).toString();

  return {
    id: p.id,
    supports: () => true, // ChangeNOW lists hundreds of assets; the asset list in config decides what we offer
    async quote(asset, amountIn) {
      const q = pair(asset);
      const [min, est] = await Promise.all([
        call<{ minAmount?: number }>(`/exchange/min-amount?${qs(q)}`).catch(() => ({ minAmount: undefined })),
        call<{ toAmount?: number; validUntil?: string; transactionSpeedForecast?: string; warningMessage?: string | null }>(
          `/exchange/estimated-amount?${qs({ ...q, fromAmount: amountIn, type: "direct" })}`,
        ),
      ]);
      if (min.minAmount && amountIn < min.minAmount) throw new FundingError("belowMin", `Minimum is ${min.minAmount} ${asset.symbol}`);
      const eta = est.transactionSpeedForecast ? Number(String(est.transactionSpeedForecast).split("-").pop()) : undefined;
      return {
        provider: p.id, asset, amountIn, taoOut: Number(est.toAmount ?? 0), minAmountIn: min.minAmount,
        feesNote: "Network and swap fees are included in the amount you get.", etaMinutes: Number.isFinite(eta) ? eta : undefined,
        validUntil: est.validUntil, warning: est.warningMessage ?? undefined,
      };
    },
    async create(asset, amountIn, toAddress) {
      const r = await call<{ id: string; payinAddress: string; payinExtraId?: string; toAmount?: number; fromAmount?: number }>("/exchange", {
        method: "POST",
        body: JSON.stringify({ ...pair(asset), fromAmount: String(amountIn), address: toAddress, type: "direct" }),
      });
      const order: FundingOrder = {
        id: r.id, provider: p.id, asset, amountIn, taoExpected: Number(r.toAmount ?? 0), toAddress,
        steps: [{ type: "send", to: r.payinAddress, amount: amountIn, asset, memo: r.payinExtraId || undefined }],
        state: "awaitingDeposit", createdAt: new Date().toISOString(),
        trackUrl: c.trackUrl?.replace("{id}", r.id),
      };
      return order;
    },
    async status(id): Promise<StatusUpdate> {
      const r = await call<{ status: string; amountTo?: number | null; payinHash?: string | null; payoutHash?: string | null }>(`/exchange/by-id?id=${encodeURIComponent(id)}`);
      return {
        state: mapChangenowStatus(r.status), taoReceived: r.amountTo ?? undefined,
        payinHash: r.payinHash ?? undefined, payoutHash: r.payoutHash ?? undefined,
      };
    },
  };
}
