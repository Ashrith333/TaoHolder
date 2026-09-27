import { encodeAddress } from "@polkadot/util-crypto";
import type { HistoryLeg, HistoryTx } from "@/services/types";

// Builds History from Taostats' three feeds (checked against a real account):
//  • extrinsics  — everything the wallet signed, INCLUDING failures, with call args and fee
//  • stakeEvents — actual amounts per subnet for successful stake changes, plus things the
//                  wallet never signed: stake sent to it (is_transfer) and validator key swaps
//  • transfers   — TAO in and out (incoming ones never appear in extrinsics)
// Signed transactions are the backbone; events fill in exact amounts; the rest is added.

type Row = Record<string, unknown>;
export type Feeds = { extrinsics: Row[]; stakeEvents: Row[]; transfers: Row[] };

const rao = (v: unknown) => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n / 1e9 : 0;
};
const str = (v: unknown) => (typeof v === "string" ? v : "");
const obj = (v: unknown): Row => (v && typeof v === "object" ? (v as Row) : {});
const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));

/** 0x public key or {__kind:"Id", value} or {ss58} → SS58. */
export function toSs58(v: unknown, prefix = 42): string {
  const o = obj(v);
  const raw = typeof v === "string" ? v : str(o.ss58) || str(o.value);
  if (!raw.startsWith("0x")) return raw;
  try {
    return encodeAddress(raw, prefix);
  } catch {
    return raw;
  }
}

type Call = { pallet: string; method: string; args: Row };

/** Flatten a signed extrinsic into its calls (batch, batch_all and force_batch included). */
export function callsOf(ex: Row): Call[] {
  const [pallet = "", method = ""] = str(ex.full_name).split(".");
  const args = obj(ex.call_args);
  if (pallet === "Utility" && Array.isArray(args.calls)) {
    return (args.calls as Row[]).map((c) => {
      const v = obj(c.value);
      const { __kind, ...rest } = v;
      return { pallet: str(c.__kind), method: str(__kind), args: rest };
    });
  }
  return [{ pallet, method, args }];
}

const lower = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();

/** One call → a leg (stake changes), a transfer, or null (unknown call). */
function legFor(c: Call, prefix: number): HistoryLeg | { transfer: { tao: number; to: string } } | null {
  const pallet = lower(c.pallet);
  const m = lower(c.method);
  const a = c.args;
  const hk = a.hotkey ? toSs58(a.hotkey, prefix) : undefined;
  if (pallet === "balances" && m.startsWith("transfer")) return { transfer: { tao: rao(a.value), to: toSs58(a.dest, prefix) } };
  if (pallet !== "subtensor_module") return null;
  const netuid = num(a.netuid);
  if (m.startsWith("add_stake")) {
    return netuid === 0
      ? { type: "stake", netuid: 0, tao: rao(a.amountStaked), hotkey: hk, estimate: true }
      : { type: "invest", netuid, tao: rao(a.amountStaked), hotkey: hk, estimate: true };
  }
  if (m === "remove_stake" || m === "remove_stake_limit" || m === "remove_stake_full_limit") {
    return netuid === 0
      ? { type: "unstake", netuid: 0, tao: rao(a.amountUnstaked), hotkey: hk, estimate: true }
      : { type: "sell", netuid, tao: 0, tokens: a.amountUnstaked ? rao(a.amountUnstaked) : undefined, hotkey: hk, estimate: true };
  }
  if (m === "unstake_all" || m === "unstake_all_alpha") return { type: "unstakeAll", netuid: null, tao: 0, hotkey: hk, estimate: true };
  if (m === "move_stake" || m.startsWith("swap_stake")) {
    return {
      type: "move", netuid: num(a.destinationNetuid), fromNetuid: num(a.originNetuid), tao: 0, tokens: rao(a.alphaAmount),
      hotkey: a.destinationHotkey ? toSs58(a.destinationHotkey, prefix) : hk, fromHotkey: a.originHotkey ? toSs58(a.originHotkey, prefix) : hk, estimate: true,
    };
  }
  if (m === "transfer_stake") {
    return { type: "sendStake", netuid: num(a.originNetuid), tao: 0, tokens: rao(a.alphaAmount), hotkey: hk, counterparty: toSs58(a.destinationColdkey, prefix), estimate: true };
  }
  return null;
}

const ADD = new Set(["stake", "invest"]);
const REMOVE = new Set(["sell", "unstake", "unstakeAll"]);

/** Replace planned amounts with what actually happened, from that extrinsic's stake events. */
function applyEvents(legs: HistoryLeg[], events: Row[]): HistoryLeg[] {
  const used = new Set<Row>();
  const out = legs.map((l) => {
    const want = ADD.has(l.type) ? "DELEGATE" : REMOVE.has(l.type) ? "UNDELEGATE" : null;
    if (!want || l.type === "unstakeAll") return l;
    const ev = events.find((e) => !used.has(e) && str(e.action) === want && num(e.netuid) === l.netuid);
    if (!ev) return l;
    used.add(ev);
    return { ...l, tao: rao(ev.amount), tokens: l.netuid === 0 ? undefined : rao(ev.alpha), validatorName: str(ev.delegate_name) || undefined, estimate: false };
  });
  // unstake_all (and anything unmatched) → one leg per remaining event
  const hadAll = legs.some((l) => l.type === "unstakeAll");
  const rest = events.filter((e) => !used.has(e) && !e.is_transfer);
  if (!rest.length) return out;
  const extra = rest.map((e) => eventLeg(e));
  return hadAll ? [...out.filter((l) => l.type !== "unstakeAll"), ...extra] : [...out, ...extra];
}

function eventLeg(e: Row): HistoryLeg {
  const netuid = num(e.netuid);
  const out = str(e.action) === "UNDELEGATE";
  const type: HistoryLeg["type"] = netuid === 0 ? (out ? "unstake" : "stake") : out ? "sell" : "invest";
  return { type, netuid, tao: rao(e.amount), tokens: netuid === 0 ? undefined : rao(e.alpha), hotkey: toSs58(e.delegate), validatorName: str(e.delegate_name) || undefined };
}

export function buildHistory(feeds: Feeds, coldkey: string, prefix = 42): HistoryTx[] {
  const byExtrinsic = new Map<string, Row[]>();
  for (const e of feeds.stakeEvents) {
    const id = str(e.extrinsic_id);
    byExtrinsic.set(id, [...(byExtrinsic.get(id) ?? []), e]);
  }
  const signedIds = new Set<string>();
  const txs: HistoryTx[] = [];

  for (const ex of feeds.extrinsics) {
    const id = str(ex.id);
    signedIds.add(id);
    const ok = ex.success === true;
    const legs: HistoryLeg[] = [];
    let transfer: HistoryTx["transfer"];
    const unknown: string[] = [];
    for (const c of callsOf(ex)) {
      const r = legFor(c, prefix);
      if (!r) unknown.push(`${c.pallet}.${c.method}`);
      else if ("transfer" in r) transfer = { direction: "out", tao: r.transfer.tao, counterparty: r.transfer.to };
      else legs.push(r);
    }
    const err = obj(ex.error);
    const base = {
      id, time: str(ex.timestamp), status: (ok ? "done" : "failed") as HistoryTx["status"],
      fee: rao(ex.fee), block: num(ex.block_number) ?? undefined, hash: str(ex.hash) || undefined, extrinsicId: id,
      reasonCode: ok ? undefined : str(err.name) || undefined, reason: ok ? undefined : str(err.extra_info) || str(err.name) || undefined,
    };
    if (legs.length) txs.push({ ...base, kind: "trade", legs: ok ? applyEvents(legs, byExtrinsic.get(id) ?? []) : legs });
    else if (transfer) txs.push({ ...base, kind: "transfer", legs: [], transfer });
    else txs.push({ ...base, kind: "other", legs: [], call: unknown.join(", ") || str(ex.full_name) });
  }

  // Stake changes the wallet did not sign: stake sent to it, validator key swaps, proxies.
  for (const [id, events] of byExtrinsic) {
    if (signedIds.has(id)) continue;
    const first = events[0]!;
    const base = { id, time: str(first.timestamp), status: "done" as const, block: num(first.block_number) ?? undefined, extrinsicId: id };
    if (str(first.id).startsWith("hotkey-swap") || events.every((e) => str(e.id).startsWith("hotkey-swap"))) {
      const inEv = events.find((e) => str(e.action) === "DELEGATE") ?? first;
      const outEv = events.find((e) => str(e.action) === "UNDELEGATE");
      txs.push({ ...base, kind: "validatorChange", legs: [{
        type: "move", netuid: num(inEv.netuid), fromNetuid: num(inEv.netuid), tao: 0, tokens: rao(inEv.alpha),
        hotkey: toSs58(inEv.delegate), fromHotkey: outEv ? toSs58(outEv.delegate) : undefined, validatorName: str(inEv.delegate_name) || undefined,
      }] });
      continue;
    }
    const legs = events.map((e): HistoryLeg => {
      if (e.is_transfer) {
        const incoming = str(e.action) === "DELEGATE";
        return { type: incoming ? "receiveStake" : "sendStake", netuid: num(e.netuid), tao: rao(e.amount), tokens: rao(e.alpha),
          hotkey: toSs58(e.delegate), validatorName: str(e.delegate_name) || undefined, counterparty: toSs58(e.transfer_address) };
      }
      return eventLeg(e);
    });
    txs.push({ ...base, kind: "trade", legs });
  }

  // TAO transfers: outgoing ones are already covered by the signed list.
  for (const t of feeds.transfers) {
    const id = str(t.extrinsic_id);
    if (signedIds.has(id)) continue;
    const from = toSs58(t.from);
    const incoming = toSs58(t.to) === coldkey;
    txs.push({
      id: id || str(t.id), kind: "transfer", time: str(t.timestamp), status: "done", block: num(t.block_number) ?? undefined,
      hash: str(t.transaction_hash) || undefined, extrinsicId: id || undefined, legs: [],
      transfer: { direction: incoming ? "in" : "out", tao: rao(t.amount), counterparty: incoming ? from : toSs58(t.to) },
    });
  }
  return txs.sort((a, b) => b.time.localeCompare(a.time));
}
