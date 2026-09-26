import type { Batch } from "@/services/buildBatch";
import type { TxEvent } from "@/services/txMachine";

export type SubmitArgs = {
  batch: Batch;
  address: string;
  signer: unknown;
  rpcWs: string;
  dropAfterSec: number;
  onEvent: (e: TxEvent) => void;
  decodeError: (name: string) => string;
};

export type DemoOutcome = "approve" | "reject" | "priceMoved" | "noBlock";
