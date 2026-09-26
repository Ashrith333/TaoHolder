"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { poolFromDto, positionsFromDto, type HistoryPage, type PositionsDto, type SeriesPoint, type SubnetLiveDto } from "@/adapters/sources/dto";
import { useConfig } from "@/providers/ConfigProvider";
import type { Subnet, SubnetCurated, SubnetLive } from "@/services/types";

// Client data hooks over the API routes (PRD 16.3).
async function get<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? `HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

type SubnetsDto = { subnets: (SubnetCurated & { live?: SubnetLiveDto })[]; usd: number | null };

export function useSubnets() {
  return useQuery({
    queryKey: ["subnets"],
    queryFn: () => get<SubnetsDto>("/api/subnets"),
    select: (d) => ({ usd: d.usd, subnets: d.subnets.map((s): Subnet => ({ ...s, live: s.live ? poolFromDto(s.live) : undefined })) }),
    staleTime: 60_000,
  });
}

export function useSubnet(netuid: number) {
  return useQuery({
    queryKey: ["subnet", netuid],
    queryFn: () => get<{ subnet: SubnetCurated & { live?: SubnetLiveDto }; series30d: SeriesPoint[]; usd: number | null }>(`/api/subnets/${netuid}`),
    select: (d) => ({ ...d, subnet: { ...d.subnet, live: d.subnet.live ? poolFromDto(d.subnet.live) : undefined } as Subnet }),
    staleTime: 60_000,
  });
}

/** Fresh pool reserves for quoting (1 block cache). */
export async function fetchPools(netuids: number[]): Promise<Map<number, SubnetLive>> {
  const d = await get<{ pools: SubnetLiveDto[] }>(`/api/pools?netuids=${netuids.join(",")}`);
  return new Map(d.pools.map((p) => [p.netuid, poolFromDto(p)]));
}

export function usePositions(address: string | null) {
  const { app } = useConfig();
  return useQuery({
    queryKey: ["positions", address],
    enabled: !!address,
    queryFn: () => get<PositionsDto>(`/api/positions?coldkey=${encodeURIComponent(address!)}`),
    select: positionsFromDto,
    refetchInterval: app.refreshMs,
    staleTime: 10_000,
  });
}

export function useHistory(address: string | null) {
  return useInfiniteQuery({
    queryKey: ["history", address],
    enabled: !!address,
    initialPageParam: "0",
    queryFn: ({ pageParam }) => get<HistoryPage>(`/api/history?coldkey=${encodeURIComponent(address!)}&cursor=${pageParam}`),
    getNextPageParam: (last) => last.next,
    staleTime: 30_000,
  });
}
