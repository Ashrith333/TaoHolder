"use client";
import { useMemo } from "react";
import { usePositions, useSubnets } from "@/hooks/data";
import { useConfig } from "@/providers/ConfigProvider";
import { useTrade } from "@/stores/trade";
import { useWallet } from "@/stores/wallet";
import { sellLine } from "@/services/sell";
import { makeSellQuote } from "@/services/tradeQuote";
import type { SubnetLive } from "@/services/types";

// Sell tab (S10): every position with its own amount, Half/All, stays line, dust rule.
export function useSellModel() {
  const { guards, validators } = useConfig();
  const address = useWallet((s) => s.address);
  const positions = usePositions(address);
  const subnets = useSubnets();
  const st = useTrade();
  const pools = useMemo(
    () => new Map((subnets.data?.subnets ?? []).filter((s) => s.live).map((s) => [s.netuid, s.live as SubnetLive])),
    [subnets.data],
  );
  const names = new Map((subnets.data?.subnets ?? []).map((s) => [s.netuid, s]));
  const p = positions.data;
  const items = p
    ? [
        ...(p.root > 0n ? [{ netuid: 0, hotkey: p.rootHotkey ?? validators.default.hotkey, held: p.root, valueTao: p.root }] : []),
        ...p.positions.map((x) => ({ netuid: x.netuid, hotkey: x.hotkey, held: x.alpha, valueTao: x.valueTao })),
      ]
    : [];
  const lines = items.map((it) => ({
    ...it,
    pick: st.sell[String(it.netuid)],
    line: sellLine(it.held, st.sell[String(it.netuid)], it.netuid === 0 ? null : (pools.get(it.netuid) ?? null), guards.sellDustTao),
  }));
  const chosen = lines.filter((l) => l.pick && l.line.amount > 0n);
  const draft = chosen.length
    ? makeSellQuote({ pools, validators, cfg: guards, now: 0, id: "draft" }, chosen.map((l) => ({ netuid: l.netuid, hotkey: l.hotkey, amount: l.line.amount })))
    : null;
  return { address, positions, lines, chosen, draft, names, st };
}
