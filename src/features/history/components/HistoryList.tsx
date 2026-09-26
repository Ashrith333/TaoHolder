"use client";
import { useState } from "react";
import { Alert, Button, Chip, ChipRow, Skeleton, Tag } from "@/components/ui";
import { useHistory } from "@/hooks/data";
import { useMounted } from "@/hooks/mounted";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { formatTao } from "@/services/format";
import { useTxLog } from "@/stores/txLog";
import { useWallet } from "@/stores/wallet";
import type { HistoryItem } from "@/services/types";

type Filter = "all" | HistoryItem["action"];

/** S13: indexer history merged with this browser's local tx log (pending shows at once). */
export function HistoryList() {
  const t = useT();
  const { explorer } = useConfig();
  const mounted = useMounted();
  const address = useWallet((s) => s.address);
  const local = useTxLog((s) => s.entries).filter((e) => e.owner === address);
  const q = useHistory(address);
  const [filter, setFilter] = useState<Filter>("all");
  const remote = q.data?.pages.flatMap((p) => p.items) ?? [];
  const localOnly = q.data?.pages.some((p) => p.localOnly) || q.isError;
  const seen = new Set(remote.map((r) => r.hash).filter(Boolean));
  const items = [...(mounted ? local.filter((l) => !l.hash || !seen.has(l.hash)) : []), ...remote]
    .filter((i) => filter === "all" || i.action === filter)
    .sort((a, b) => b.time.localeCompare(a.time));
  const statusKind = (s: HistoryItem["status"]) => (s === "failed" ? "high" : s === "cancelled" ? "pool" : s === "pending" ? "medium" : "neutral");
  return (
    <section className="space-y-4">
      <h1 className="text-[22px] font-extrabold">{t("history.title")}</h1>
      <ChipRow>
        {(["all", "invest", "sell", "stake"] as Filter[]).map((f) => <Chip key={f} on={filter === f} onClick={() => setFilter(f)}>{t(`history.filter.${f}`)}</Chip>)}
      </ChipRow>
      {localOnly ? <Alert>{t("history.localOnly")}</Alert> : null}
      {q.isLoading ? <Skeleton h={180} /> : items.length === 0 ? (
        <p className="card p-8 text-center text-muted">{t("history.empty")}</p>
      ) : (
        <ul className="card divide-y divide-line">
          {items.map((i) => {
            const href = i.hash && explorer ? explorer.replace("{hash}", i.hash) : null;
            return (
              <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{i.label}</p>
                  <p className="text-[12px] text-muted">{new Date(i.time).toLocaleString()}{href ? <> · <a href={href} target="_blank" rel="noreferrer" className="underline">{t("tx.explorer")}</a></> : null}</p>
                </div>
                <div className="text-right">
                  <p className="num text-[14px] font-bold">{i.taoIn ? `−${formatTao(i.taoIn)}` : `+${formatTao(i.taoOut)}`}</p>
                  <Tag kind={statusKind(i.status)}>{t(`history.status.${i.status}`)}</Tag>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {q.hasNextPage ? <Button kind="secondary" full loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{t("history.more")}</Button> : null}
    </section>
  );
}
