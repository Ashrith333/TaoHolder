import { isPriceLimitError } from "@/services/txMachine";
import type { Batch } from "@/services/buildBatch";
import type { SubmitArgs } from "./types";

// Real submit over WsProvider (PRD 14.2). @polkadot/api is loaded only after Connect.
type AnyApi = {
  tx: Record<string, Record<string, ((...a: unknown[]) => unknown) & { meta: { args: unknown[] } }>>;
  registry: { findMetaError: (m: unknown) => { name: string } };
  disconnect: () => Promise<void>;
};

const CONNECT_TIMEOUT_MS = 20_000;
let apiPromise: Promise<AnyApi> | null = null;
async function getApi(rpcWs: string): Promise<AnyApi> {
  if (!rpcWs) throw new SubmitError("RpcUnavailable", "No RPC endpoint configured (data_sources kind rpc_ws)");
  if (!apiPromise) {
    apiPromise = import("@polkadot/api").then(async ({ ApiPromise, WsProvider }) => {
      const provider = new WsProvider(rpcWs);
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new SubmitError("RpcUnavailable", `No answer from ${rpcWs} in ${CONNECT_TIMEOUT_MS / 1000}s`)), CONNECT_TIMEOUT_MS),
      );
      try {
        return (await Promise.race([ApiPromise.create({ provider }), timeout])) as unknown as AnyApi;
      } catch (e) {
        provider.disconnect().catch(() => undefined);
        throw e;
      }
    });
    apiPromise.catch(() => (apiPromise = null)); // retry on the next attempt
  }
  return apiPromise;
}

/** Failures before anything reaches the chain. `code` maps to content/copy/errors.json. */
export class SubmitError extends Error {
  constructor(public code: string, detail: string) {
    super(detail);
  }
}

/** Map call descriptors onto api.tx, checking arg counts against live metadata (T0). */
export function toExtrinsic(api: AnyApi, batch: Batch) {
  const calls = batch.calls.map((c) => {
    const fn = api.tx[c.pallet]?.[c.method];
    if (!fn) throw new SubmitError("BuildFailed", `Chain has no ${c.pallet}.${c.method}`);
    if (fn.meta.args.length !== c.args.length) throw new SubmitError("BuildFailed", `${c.pallet}.${c.method} expects ${fn.meta.args.length} args, got ${c.args.length}`);
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
  let settled = false;
  let unsub: (() => void) | null = null;
  let drop: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!a.signer) throw new SubmitError("NoSigner", "Wallet is not connected in this tab");
    const api = await getApi(a.rpcWs);
    const tx = toExtrinsic(api, a.batch);
    drop = setTimeout(() => !settled && a.onEvent({ t: "DROP" }), a.dropAfterSec * 1000);
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
    const raw = String((e as Error)?.message ?? e);
    const msg = raw.toLowerCase();
    console.error("[submit]", e);
    if (msg.includes("cancel") || msg.includes("reject")) a.onEvent({ t: "REJECT" });
    else {
      const code = e instanceof SubmitError ? e.code : "default";
      a.onEvent({ t: "FAIL", reason: `${a.decodeError(code)} (${raw})`, priceLimit: false });
    }
  }
  return () => {
    clearTimeout(drop);
    unsub?.();
  };
}
