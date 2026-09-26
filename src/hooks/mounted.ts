"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during SSR and hydration, true after: avoids mismatches for localStorage-backed values. */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}
