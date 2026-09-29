"use client";
import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useFunding } from "@/stores/funding";
import { isFinal, type FundingOrder, type FundingQuote } from "@/services/funding/types";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
  return body as T;
}

export function useFundingQuote(assetId: string, amount: number) {
  return useQuery({
    queryKey: ["fundingQuote", assetId, amount],
    enabled: amount > 0,
    queryFn: () => api<FundingQuote>(`/api/funding/quote?asset=${encodeURIComponent(assetId)}&amount=${amount}`),
    staleTime: 20_000,
    retry: false,
  });
}

export function useCreateOrder() {
  const upsert = useFunding((s) => s.upsert);
  return useMutation({
    mutationFn: (b: { provider: string; asset: string; amount: number; toAddress: string }) =>
      api<FundingOrder>("/api/funding/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }),
    onSuccess: upsert,
  });
}

/** Poll an order until it reaches a final state (fast for demo, every 15 s otherwise). */
export function useOrderStatus(order: FundingOrder | undefined) {
  const patch = useFunding((s) => s.patch);
  const q = useQuery({
    queryKey: ["fundingOrder", order?.id, order?.sentAt],
    enabled: !!order && !isFinal(order.state),
    queryFn: () => api<Partial<FundingOrder>>(`/api/funding/orders/${encodeURIComponent(order!.id)}?provider=${order!.provider}${order!.sentAt ? `&sentAt=${order!.sentAt}` : ""}`),
    refetchInterval: order?.provider === "demo" ? 1000 : 15_000,
  });
  // Write each new status once. Depending on `order` itself would loop: every patch
  // produces a new order object, which would re-run this effect.
  const id = order?.id;
  useEffect(() => {
    if (id && q.data) patch(id, q.data);
  }, [q.data, id, patch]);
  return q;
}
