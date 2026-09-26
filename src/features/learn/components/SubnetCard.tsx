import Link from "next/link";
import { Badge, Change, Tag } from "@/components/ui";
import { formatPrice } from "@/services/format";
import type { Subnet } from "@/services/types";
import { BookmarkStar } from "./BookmarkStar";

export function SubnetCard({ s, likeLabel }: { s: Subnet; likeLabel: string }) {
  return (
    <Link href={`/learn/${s.netuid}`} className="card flex items-center gap-3 p-3 hover:bg-s2">
      <Badge netuid={s.netuid} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{s.name} <span className="text-muted">SN{s.netuid}</span></span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
          <span className="truncate">{s.job}</span>
          {s.twin ? <Tag kind="like">{likeLabel}</Tag> : null}
        </span>
      </span>
      {s.live ? (
        <span className="text-right">
          <span className="num block text-[13px] font-bold">{formatPrice(s.live.priceTao)}</span>
          <Change pct={s.live.change7d} />
        </span>
      ) : null}
      <BookmarkStar netuid={s.netuid} />
    </Link>
  );
}
