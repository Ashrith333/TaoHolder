"use client";
import { usePositions, useSubnets } from "@/hooks/data";
import { useWallet } from "@/stores/wallet";
import { isEmpty } from "@/services/positions";

export function useAccount() {
  const address = useWallet((s) => s.address);
  const q = usePositions(address);
  const subnets = useSubnets();
  const names = new Map((subnets.data?.subnets ?? []).map((s) => [s.netuid, s]));
  return { address, q, data: q.data, empty: q.data ? isEmpty(q.data) : false, names };
}
