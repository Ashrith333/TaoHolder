"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { demoSubmit } from "@/adapters/chain/demo";
import { submitBatch } from "@/adapters/chain/submit";
import type { DemoOutcome } from "@/adapters/chain/types";
import { getSigner } from "@/adapters/wallet";
import { track } from "@/adapters/analytics";
import { fetchPools } from "@/hooks/data";
import { useConfig } from "@/providers/ConfigProvider";
import { useTrade } from "@/stores/trade";
import { useTxLog } from "@/stores/txLog";
import { useWallet } from "@/stores/wallet";
import { buildBatch } from "@/services/buildBatch";
import { diffQuotes } from "@/services/quoteDiff";
import { removeLeg, requote } from "@/services/quoteBuilder";
import { raoToTao } from "@/services/rao";
import { newQuoteId, shockPool } from "@/services/tradeQuote";
import { initialTx, txReducer, type TxEvent, type TxState } from "@/services/txMachine";
import type { Quote } from "@/services/types";

// Preview + transaction states (S08, S09, S14), driven by the pure tx machine.
export function usePreviewFlow() {
  const cfg = useConfig();
  const qc = useQueryClient();
  const { quote, prevQuote, set } = useTrade();
  const { address, demo } = useWallet();
  const log = useTxLog();
  const [attempts, setAttempts] = useState(0);
  const [tx, dispatchRaw] = useReducer((s: TxState, e: TxEvent) => txReducer(s, e), quote ? { s: "previewReady" } : initialTx);
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const cancel = useRef<(() => void) | null>(null);
  const logId = useRef<string | null>(null);

  const env = useCallback((pools: Awaited<ReturnType<typeof fetchPools>>) => ({ pools, validators: cfg.validators, cfg: cfg.guards, now: Date.now(), id: newQuoteId() }), [cfg]);

  const refresh = useCallback(async (q: Quote, opts: { shock?: number } = {}) => {
    const netuids = q.legs.filter((l) => l.netuid !== 0).map((l) => l.netuid);
    let pools = await fetchPools(netuids);
    if (opts.shock !== undefined) pools = shockPool(pools, opts.shock);
    return requote(env(pools), q);
  }, [env]);

  const dispatch = useCallback((e: TxEvent) => {
    dispatchRaw(e);
    const id = logId.current;
    if (!id) return;
    if (e.t === "SUBMITTED") log.update(id, { hash: e.hash });
    if (e.t === "FINALIZED") {
      log.update(id, { status: "done" });
      track("tx_finalized", { legCount: quote?.legs.length ?? 0 });
      qc.invalidateQueries({ queryKey: ["positions"] });
      qc.invalidateQueries({ queryKey: ["history"] });
    }
    if (e.t === "FAIL") {
      log.update(id, { status: e.priceLimit ? "cancelled" : "failed" });
      track("tx_failed", { reason: e.reason });
    }
    if (e.t === "REJECT" || e.t === "DROP") log.update(id, { status: e.t === "REJECT" ? "cancelled" : "pending" });
  }, [log, qc, quote]);

  // Price-limit failure → keep old quote, fetch new, diff (S14).
  useEffect(() => {
    if (tx.s !== "failedOnChain" || !tx.priceLimit || !quote) return;
    dispatchRaw({ t: "QUOTE" });
    const shock = demo ? (tx.netuid ?? quote.legs.find((l) => l.kind !== "stakeRoot")?.netuid) : undefined;
    refresh(quote, { shock }).then((next) => {
      set({ prevQuote: quote, quote: next });
      setAttempts((a) => a + 1);
      dispatchRaw({ t: "REQUOTED" });
    });
  }, [tx, quote, demo, refresh, set]);

  const expiring = useRef(false);
  const expire = useCallback(async () => {
    if (expiring.current || !quote || (tx.s !== "previewReady" && tx.s !== "requoteReady" && tx.s !== "rejectedByUser")) return;
    expiring.current = true;
    track("quote_expired", { secondsOpen: cfg.guards.quoteTtlSec });
    const next = await refresh(quote);
    const d = diffQuotes(quote, next, cfg.guards);
    setFlash(new Set(d.filter((x) => x.status === "changed").map((x) => x.netuid)));
    setTimeout(() => setFlash(new Set()), 2000);
    set({ quote: next });
    expiring.current = false;
  }, [quote, tx.s, refresh, cfg.guards, set]);

  const confirm = useCallback(async (outcome?: DemoOutcome) => {
    if (!quote || !address) return;
    cancel.current?.();
    dispatchRaw({ t: "CONFIRM" });
    if (demo && !outcome) return; // demo: wait for a Demo button (approve / reject / prices moved / no block)
    const id = `tx_${Date.now()}`;
    logId.current = id;
    const invest = quote.legs.filter((l) => l.kind === "invest").length;
    log.add({
      id, owner: address, action: quote.side === "sell" ? "sell" : invest ? "invest" : "stake",
      label: quote.side === "sell" ? `Sell · ${quote.legs.length} legs` : invest ? `Invest · ${quote.legs.length} legs` : "Stake TAO",
      legs: quote.legs.length, time: new Date().toISOString(), status: "pending",
      taoIn: quote.side === "add" ? raoToTao(quote.legs.reduce((s, l) => s + l.amountIn, 0n)) : 0,
      taoOut: quote.side === "sell" ? raoToTao(quote.legs.reduce((s, l) => s + l.estValueTao, 0n)) : 0,
    });
    track("tx_submitted", { mode: quote.side, legCount: quote.legs.length });
    if (demo) {
      const failAt = quote.legs.find((l) => l.kind === "invest" || l.kind === "sell")?.netuid;
      cancel.current = demoSubmit(outcome ?? "approve", failAt, dispatch);
      return;
    }
    cancel.current = await submitBatch({
      batch: buildBatch(quote.legs), address, signer: getSigner(), rpcWs: cfg.rpcWs ?? "", dropAfterSec: cfg.guards.dropAfterSec,
      onEvent: dispatch, decodeError: (n) => cfg.errors[n] ?? cfg.errors.default ?? n,
    });
  }, [quote, address, demo, dispatch, cfg, log]);

  useEffect(() => () => cancel.current?.(), []);

  const remove = (netuid: number) => quote && set({ quote: removeLeg(quote, netuid) });
  const diff = prevQuote && quote && tx.s === "requoteReady" ? diffQuotes(prevQuote, quote, cfg.guards) : null;
  return { quote, tx, demo, confirm, expire, remove, diff, flash, attempts, reset: () => dispatchRaw({ t: "RESET" }) };
}

export type PreviewFlow = ReturnType<typeof usePreviewFlow>;
