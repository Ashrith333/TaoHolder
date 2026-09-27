"use client";
import { useMemo, useState } from "react";
import { Alert, Button, Chip, ChipRow, Skeleton } from "@/components/ui";
import { useHistory, useSubnets } from "@/hooks/data";
import { useMounted } from "@/hooks/mounted";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { matchesFilter, mergeHistory, type HistoryFilter } from "@/services/history";
import { useTxLog } from "@/stores/txLog";
import { useWallet } from "@/stores/wallet";
import { HistoryCard } from "./HistoryCard";

const FILTERS: HistoryFilter[] = ["all", "trade", "sell", "transfer"];

/** S13: one card per transaction, merged from the indexer and this browser's log. */
export function HistoryList() {
  const t = useT();
  const { validators } = useConfig();
  const mounted = useMounted();
  const address = useWallet((s) => s.address);
  const entries = useTxLog((s) => s.entries);
  const q = useHistory(address);
  const subnets = useSubnets();
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const names = useMemo(() => new Map((subnets.data?.subnets ?? []).map((s) => [s.netuid, s.name])), [subnets.data]);
  const validatorNames = useMemo(
    () => new Map([...validators.all, ...Object.values(validators.perNetuid).flat()].map((v) => [v.hotkey, v.name])),
    [validators],
  );
  const items = useMemo(() => {
    const local = mounted ? entries.filter((e) => e.owner === address) : [];
    const remote = q.data?.pages.flatMap((p) => p.items) ?? [];
    return mergeHistory(local, remote).filter((tx) => matchesFilter(tx, filter));
  }, [mounted, entries, address, q.data, filter]);
  const localOnly = q.data?.pages.some((p) => p.localOnly) || q.isError;

  return (
    <section className="mx-auto max-w-[760px] space-y-4">
      <h1 className="pr-12 text-[22px] font-extrabold">{t("history.title")}</h1>
      <ChipRow>{FILTERS.map((f) => <Chip key={f} on={filter === f} onClick={() => setFilter(f)}>{t(`history.filter.${f}`)}</Chip>)}</ChipRow>
      {localOnly ? <Alert>{t("history.localOnly")}</Alert> : null}
      {q.isLoading ? (
        <Skeleton h={180} />
      ) : items.length === 0 ? (
        <p className="card p-8 text-center text-muted">{t("history.empty")}</p>
      ) : (
        <ul className="card overflow-hidden">
          {items.map((tx) => <HistoryCard key={tx.id} tx={tx} names={names} validatorNames={validatorNames} />)}
        </ul>
      )}
      {q.hasNextPage ? <Button kind="secondary" full loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{t("history.more")}</Button> : null}
    </section>
  );
}
