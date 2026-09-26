// Transaction state machine (PRD 11). Pure reducer; UI and chain adapter dispatch events.
export type TxState =
  | { s: "idle" }
  | { s: "quoting" }
  | { s: "previewReady" }
  | { s: "quoteExpired" }
  | { s: "awaitingSignature" }
  | { s: "rejectedByUser" }
  | { s: "submitted"; hash: string }
  | { s: "inBlock"; hash: string; block: number }
  | { s: "finalized"; hash: string; block: number }
  | { s: "dropped"; hash?: string }
  | { s: "failedOnChain"; reason: string; priceLimit: boolean; netuid?: number }
  | { s: "requoteReady"; attempt: number };

export type TxEvent =
  | { t: "QUOTE" }
  | { t: "QUOTED" }
  | { t: "EXPIRE" }
  | { t: "CONFIRM" }
  | { t: "REJECT" }
  | { t: "SUBMITTED"; hash: string }
  | { t: "IN_BLOCK"; block: number }
  | { t: "FINALIZED" }
  | { t: "DROP" }
  | { t: "FAIL"; reason: string; priceLimit: boolean; netuid?: number }
  | { t: "REQUOTED" }
  | { t: "RESET" };

export const initialTx: TxState = { s: "idle" };

export function txReducer(state: TxState, e: TxEvent, attempts = 0): TxState {
  if (e.t === "RESET") return initialTx;
  switch (state.s) {
    case "idle":
    case "quoteExpired":
      return e.t === "QUOTE" ? { s: "quoting" } : state;
    case "quoting":
      if (e.t === "QUOTED") return { s: "previewReady" };
      if (e.t === "REQUOTED") return { s: "requoteReady", attempt: attempts };
      return state;
    case "previewReady":
    case "rejectedByUser":
    case "requoteReady":
      if (e.t === "CONFIRM") return { s: "awaitingSignature" };
      if (e.t === "EXPIRE") return { s: "quoteExpired" };
      if (e.t === "QUOTE") return { s: "quoting" };
      return state;
    case "awaitingSignature":
      if (e.t === "REJECT") return { s: "rejectedByUser" };
      if (e.t === "SUBMITTED") return { s: "submitted", hash: e.hash };
      if (e.t === "FAIL") return { s: "failedOnChain", reason: e.reason, priceLimit: e.priceLimit, netuid: e.netuid };
      return state;
    case "submitted":
      if (e.t === "IN_BLOCK") return { s: "inBlock", hash: state.hash, block: e.block };
      if (e.t === "DROP") return { s: "dropped", hash: state.hash };
      if (e.t === "FAIL") return { s: "failedOnChain", reason: e.reason, priceLimit: e.priceLimit, netuid: e.netuid };
      return state;
    case "inBlock":
      if (e.t === "FINALIZED") return { s: "finalized", hash: state.hash, block: state.block };
      if (e.t === "FAIL") return { s: "failedOnChain", reason: e.reason, priceLimit: e.priceLimit, netuid: e.netuid };
      return state;
    case "failedOnChain":
      if (e.t === "QUOTE") return { s: "quoting" };
      return state;
    case "dropped":
      if (e.t === "CONFIRM") return { s: "awaitingSignature" };
      if (e.t === "QUOTE") return { s: "quoting" };
      return state;
    case "finalized":
      return state;
  }
}

/** Module errors that mean "price moved past the limit" → S14. */
export const PRICE_LIMIT_ERRORS = ["SlippageTooHigh", "PriceLimitExceeded", "InsufficientLiquidity"];
export const isPriceLimitError = (name: string) => PRICE_LIMIT_ERRORS.includes(name);
