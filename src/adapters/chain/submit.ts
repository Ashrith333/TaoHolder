import { isPriceLimitError } from "@/services/txMachine";
import type { Batch } from "@/services/buildBatch";
import type { SubmitArgs } from "./types";

// Real submit over WsProvider (PRD 14.2). @polkadot/api is loaded only after Connect.
type AnyApi = {
  tx: Record<string, Record<string, ((...a: unknown[]) => unknown) & { meta: { args: unknown[] } }>>;
  registry: { findMetaError: (m: unknown) => { name: string } };
  disconnect: () => Promise<void>;
};

let apiPromise: Promise<AnyApi> | null = null;
async function getApi(rpcWs: string): Promise<AnyApi> {
  if (!apiPromise) {
    apiPromise = import("@polkadot/api").then(async ({ ApiPromise, WsProvider }) => {
      const api = await ApiPromise.create({ provider: new WsProvider(rpcWs) });
      return api as unknown as AnyApi;
    });
  }
  return apiPromise;
}

/** Map call descriptors onto api.tx, checking arg counts against live metadata (T0). */
export function toExtrinsic(api: AnyApi, batch: Batch) {
  const calls = batch.calls.map((c) => {
    const fn = api.tx[c.pallet]?.[c.method];
    if (!fn) throw new Error(`Chain has no ${c.pallet}.${c.method}`);
    if (fn.meta.args.length !== c.args.length) throw new Error(`${c.pallet}.${c.method} expects ${fn.meta.args.length} args, got ${c.args.length}`);
    return fn(...c.args);
  });
  return api.tx.utility!.batchAll!(calls) as {
    paymentInfo: (addr: string) => Promise<{ partialFee: { toBigInt: () => bigint } }>;
    signAndSend: (addr: string, opts: { signer: unknown }, cb: (r: unknown) => void) => Promise<() => void>;
  };
}

export async function estimateFee(rpcWs: string, batch: Batch, address: string): Promise<bigint> {
  const api = await getApi(rpcWs);
  const info = await toExtrinsic(api, batch).paymentInfo(address);
  return info.partialFee.toBigInt();
}

type Result = {
  status: { isInBlock: boolean; isFinalized: boolean; asInBlock: { toHex: () => string } };
  txHash: { toHex: () => string };
  blockNumber?: { toNumber: () => number };
  dispatchError?: { isModule: boolean; asModule: unknown; toString: () => string };
  events: { event: { section: string; method: string; data: unknown[] } }[];
};

export async function submitBatch(a: SubmitArgs): Promise<() => void> {
  const api = await getApi(a.rpcWs);
  const tx = toExtrinsic(api, a.batch);
  let settled = false;
  let unsub: (() => void) | null = null;
  const drop = setTimeout(() => !settled && a.onEvent({ t: "DROP" }), a.dropAfterSec * 1000);
  try {
    unsub = await tx.signAndSend(a.address, { signer: a.signer }, (raw) => {
      const r = raw as Result;
      if (!settled && !r.status.isInBlock && !r.status.isFinalized) a.onEvent({ t: "SUBMITTED", hash: r.txHash.toHex() });
      if (r.status.isInBlock && !settled) {
        settled = true;
        clearTimeout(drop);
        const failed = r.dispatchError ?? (r.events.find((e) => e.event.method === "BatchInterrupted")?.event.data[1] as Result["dispatchError"]);
        if (failed) {
          const name = failed.isModule ? api.registry.findMetaError(failed.asModule).name : failed.toString();
          a.onEvent({ t: "FAIL", reason: a.decodeError(name), priceLimit: isPriceLimitError(name) });
          return;
        }
        a.onEvent({ t: "IN_BLOCK", block: r.blockNumber?.toNumber() ?? 0 });
      }
      if (r.status.isFinalized) {
        a.onEvent({ t: "FINALIZED" });
        unsub?.();
      }
    });
  } catch (e) {
    clearTimeout(drop);
    const msg = String((e as Error)?.message ?? e).toLowerCase();
    if (msg.includes("cancel") || msg.includes("reject")) a.onEvent({ t: "REJECT" });
    else a.onEvent({ t: "FAIL", reason: a.decodeError("default"), priceLimit: false });
  }
  return () => {
    clearTimeout(drop);
    unsub?.();
  };
}
