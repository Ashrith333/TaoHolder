"use client";
import { currencyPair } from "@/services/format";
import { raoToTao } from "@/services/rao";
import { useSettings } from "@/stores/settings";
import type { Rao } from "@/services/types";
import { useSubnets } from "./data";

/** TAO or USD first, everywhere (D5). */
export function useMoney() {
  const first = useSettings((s) => s.showFirst);
  const usd = useSubnets().data?.usd ?? null;
  return {
    usd,
    first,
    pair: (tao: number) => currencyPair(tao, usd, first),
    pairRao: (rao: Rao) => currencyPair(raoToTao(rao), usd, first),
  };
}
