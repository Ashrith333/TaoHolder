"use client";
import { useMemo } from "react";
import { useSubnets, usePositions } from "@/hooks/data";
import { useConfig } from "@/providers/ConfigProvider";
import { useOwnerBookmarks } from "@/stores/bookmarks";
import { useTrade } from "@/stores/trade";
import { useWallet } from "@/stores/wallet";
import { resolveBucket } from "@/services/buckets";
import { maxSpendable } from "@/services/guards";
import { buildPlan, validatePlan, type Modes } from "@/services/plan";
import { parseTao } from "@/services/rao";
import { makeAddQuote } from "@/services/tradeQuote";
import { revenueRuleAvailable, type SplitRule } from "@/services/weights";
import type { Subnet, SubnetLive } from "@/services/types";

// Everything the Stake & Invest tab renders, derived from config + store + live data.
export function useTradeModel() {
  const cfg = useConfig();
  const { features, guards, buckets, validators } = cfg;
  const address = useWallet((s) => s.address);
  const positions = usePositions(address);
  const subnetsQ = useSubnets();
  const bookmarks = useOwnerBookmarks(address);
  const st = useTrade();

  const modes: Modes = st.modes ?? { stake: features.defaultModes.includes("stake"), invest: features.defaultModes.includes("invest") };
  const stakePct = st.stakePct ?? features.defaultStakePct;
  const filter = st.filter ?? buckets.order[0] ?? "core";
  const subnets = useMemo(() => subnetsQ.data?.subnets ?? [], [subnetsQ.data]);

  const bucketRows = useMemo(() => subnets.map((s) => ({ netuid: s.netuid, layer: s.layer, live: s.live })), [subnets]);
  const inFilter = useMemo(() => resolveBucket(filter, buckets.buckets, bucketRows, bookmarks, buckets.exclude), [filter, buckets, bucketRows, bookmarks]);
  const selected = st.selected ?? inFilter;
  const byId = useMemo(() => new Map(subnets.map((s) => [s.netuid, s])), [subnets]);
  const shown: Subnet[] = useMemo(() => {
    const extra = selected.filter((n) => !inFilter.includes(n));
    return [...extra, ...inFilter].map((n) => byId.get(n)).filter((s): s is Subnet => !!s);
  }, [selected, inFilter, byId]);
  const ticked = shown.filter((s) => selected.includes(s.netuid));
  const weightRows = ticked.map((s) => ({ netuid: s.netuid, live: s.live, revenueUsd: s.revenueUsd }));

  const rules = features.splitRules.filter((r) => r !== "revenue" || revenueRuleAvailable(weightRows, features));
  const rule: SplitRule = rules.includes(st.rule) ? st.rule : "equal";
  const amount = parseTao(st.amount) ?? 0n;
  const free = positions.data?.free ?? 0n;
  const max = maxSpendable(free, guards.feeBufferTao);
  const planInput = { amount, modes, stakePct, rule, rows: weightRows, custom: { unit: st.customUnit, values: st.custom } };
  const plan = buildPlan(planInput);
  const issue = address ? validatePlan(plan, amount, max, modes, rule) : null;

  // Indicative quote from catalog data, for impact tags and skip reasons before Review.
  const livePools = useMemo(() => new Map(subnets.filter((s) => s.live).map((s) => [s.netuid, s.live as SubnetLive])), [subnets]);
  const env = { pools: livePools, validators, cfg: guards, now: 0, id: "draft" };
  const draft = amount > 0n && livePools.size ? makeAddQuote(env, planInput) : null;

  return { cfg, address, positions, subnetsQ, st, modes, stakePct, filter, inFilter, selected, shown, ticked, rules, rule, amount, free, max, plan, planInput, issue, draft, bookmarks };
}

export type TradeModel = ReturnType<typeof useTradeModel>;
