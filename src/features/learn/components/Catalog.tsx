"use client";
import { useMemo, useState } from "react";
import { Chip, ChipRow, Seg, Skeleton } from "@/components/ui";
import { useSubnets } from "@/hooks/data";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { useOwnerBookmarks } from "@/stores/bookmarks";
import { useWallet } from "@/stores/wallet";
import { resolveBucket } from "@/services/buckets";
import { SubnetCard } from "./SubnetCard";

type Sort = "emission" | "change7d" | "price" | "name";

/** S11: search (name, netuid, job, twin), chips from buckets.learnOrder, sort. */
export function Catalog() {
  const t = useT();
  const { buckets } = useConfig();
  const q = useSubnets();
  const address = useWallet((s) => s.address);
  const bookmarks = useOwnerBookmarks(address);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<Sort>("emission");
  const list = useMemo(() => {
    const subnets = q.data?.subnets ?? [];
    const ids = resolveBucket(filter, buckets.buckets, subnets.map((s) => ({ netuid: s.netuid, layer: s.layer, live: s.live })), bookmarks, buckets.exclude);
    const needle = query.trim().toLowerCase();
    const hit = subnets.filter((s) => ids.includes(s.netuid) && (!needle || [s.name, `sn${s.netuid}`, String(s.netuid), s.job, s.twin ?? ""].some((x) => x.toLowerCase().includes(needle))));
    const key: Record<Sort, (s: (typeof hit)[number]) => number | string> = {
      emission: (s) => -(s.live?.emissionShare ?? 0),
      change7d: (s) => -(s.live?.change7d ?? 0),
      price: (s) => -(s.live?.priceTao ?? 0),
      name: (s) => s.name.toLowerCase(),
    };
    return [...hit].sort((a, b) => (key[sort](a) < key[sort](b) ? -1 : key[sort](a) > key[sort](b) ? 1 : 0));
  }, [q.data, filter, buckets, bookmarks, query, sort]);
  const label = (k: string) => (k === "bookmarks" ? t("trade.filter.bookmarks") : k === "all" ? t("learn.filter.all") : (buckets.buckets[k]?.label ?? k));
  return (
    <section className="space-y-4">
      <h1 className="text-[22px] font-extrabold">{t("learn.title")}</h1>
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("learn.search")} aria-label={t("learn.search")}
        className="min-h-12 w-full rounded-[14px] border border-line bg-s2 px-4 text-[14px] outline-none focus:border-text" />
      <ChipRow>{buckets.learnOrder.map((k) => <Chip key={k} on={filter === k} onClick={() => setFilter(k)}>{label(k)}</Chip>)}</ChipRow>
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold text-muted">{t("learn.sort")}</span>
        <Seg<Sort> label={t("learn.sort")} value={sort} onChange={setSort} options={(["emission", "change7d", "price", "name"] as Sort[]).map((v) => ({ value: v, label: t(`learn.sort.${v}`) }))} />
      </div>
      {q.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={62} />)}</div>
      ) : list.length === 0 ? (
        <p className="card p-8 text-center text-muted">{t("learn.empty")}</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">{list.map((s) => <SubnetCard key={s.netuid} s={s} likeLabel={t("learn.like", { twin: s.twin ?? "" })} />)}</div>
      )}
    </section>
  );
}
