"use client";
import Link from "next/link";
import { Badge, Change, Skeleton, Tag } from "@/components/ui";
import { track } from "@/adapters/analytics";
import { useSubnet } from "@/hooks/data";
import { useMoney } from "@/hooks/money";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { formatPct, formatPrice, formatTao, formatUsd } from "@/services/format";
import { raoToTao } from "@/services/rao";
import { BookmarkStar } from "./BookmarkStar";
import { Sparkline } from "./Sparkline";

// S12 blocks. Each is its own section so layout.json can reorder or replace them.
// Any block with no data is hidden, never shown as "N/A".
type P = { netuid: number };

export function SubnetHead({ netuid }: P) {
  const t = useT();
  const q = useSubnet(netuid);
  if (q.isLoading) return <Skeleton h={120} />;
  if (!q.data) return <p className="card p-8 text-center text-muted">{t("learn.notFound")}</p>;
  const s = q.data.subnet;
  return (
    <section className="card p-5">
      <div className="flex items-start gap-3">
        <Badge netuid={s.netuid} size={48} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-extrabold">{s.name} <span className="text-muted">SN{s.netuid}</span></h1>
          <p className="text-[13px] text-muted">{s.layer} · {s.job}</p>
        </div>
        <BookmarkStar netuid={s.netuid} />
      </div>
      {s.product ? <p className="mt-3 text-[14px]">{s.product.split(". ")[0]}.</p> : null}
      {s.twin ? (
        <p className="mt-3 flex flex-wrap items-center gap-2"><Tag kind="like">{t("learn.like", { twin: s.twin })}</Tag><span className="text-[11.5px] text-dim">{t("learn.twinNote")}</span></p>
      ) : null}
      <Link href={`/trade?mode=invest&select=${s.netuid}`} onClick={() => track("invest_this", { netuid: s.netuid })}
        className="mt-4 flex min-h-12 items-center justify-center rounded-[14px] bg-primary font-bold text-on-primary md:inline-flex md:px-6">{t("learn.investThis")}</Link>
    </section>
  );
}

export function MarketBlock({ netuid }: P) {
  const t = useT();
  const money = useMoney();
  const q = useSubnet(netuid);
  const live = q.data?.subnet.live;
  if (!live) return null;
  const stat = (label: string, value: React.ReactNode) => (
    <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p><div className="num mt-0.5 text-[15px] font-bold">{value}</div></div>
  );
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-[17px] font-bold">{t("learn.market")}</h2>
      <Sparkline points={(q.data?.series30d ?? []).map((p) => p.price)} label={`30 day price, ${formatPct(live.change30d / 100)}`} />
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        {stat(t("learn.price"), <>{formatPrice(live.priceTao)}{money.usd ? <span className="ml-1 text-[12px] font-normal text-muted">≈ {formatUsd(live.priceTao * money.usd)}</span> : null}</>)}
        {stat("7d / 30d", <span className="flex gap-2"><Change pct={live.change7d} /><Change pct={live.change30d} /></span>)}
        {stat(t("learn.mcap"), formatTao(live.mcapTao))}
        {stat(t("learn.pool"), formatTao(raoToTao(live.taoReserve)))}
        {stat(t("learn.emission"), formatPct(live.emissionShare))}
      </div>
    </section>
  );
}

export function BusinessBlock({ netuid }: P) {
  const t = useT();
  const { features } = useConfig();
  const s = useSubnet(netuid).data?.subnet;
  if (!s) return null;
  const showRev = features.revenueOnSubnetPage && s.revenueUsd != null && s.revenueUsd > 0;
  if (!s.product && !showRev && !s.stage && !s.risks.length && !s.wins.length) return null;
  return (
    <section className="card space-y-3 p-5">
      <h2 className="text-[17px] font-bold">{t("learn.business")}</h2>
      {s.product ? <p className="text-[14px] text-muted">{s.product}</p> : null}
      <div className="flex flex-wrap gap-4">
        {showRev ? <p><span className="block text-[11px] font-semibold uppercase text-muted">{t("learn.revenue")}</span><span className="num font-bold">{formatUsd(s.revenueUsd!)}</span>{s.revenueDate ? <span className="ml-1 text-[12px] text-muted">{t("learn.revenueAsOf", { date: s.revenueDate })}</span> : null}</p> : null}
        {s.stage ? <p><span className="block text-[11px] font-semibold uppercase text-muted">{t("learn.stage")}</span><span className="font-bold">{t(`learn.stage.${s.stage}`)}</span></p> : null}
      </div>
      {s.risks.length ? <div><p className="mb-1 text-[11px] font-semibold uppercase text-muted">{t("learn.risks")}</p><div className="flex flex-wrap gap-1.5">{s.risks.map((r) => <Tag key={r} kind="pool">{r}</Tag>)}</div></div> : null}
      {s.wins.length ? <div><p className="mb-1 text-[11px] font-semibold uppercase text-muted">{t("learn.wins")}</p><ul className="list-disc pl-5 text-[13px]">{s.wins.slice(0, 3).map((w) => <li key={w}>{w}</li>)}</ul></div> : null}
      <p className="text-[11.5px] text-dim">{t("learn.curated", { date: s.curatedAt })}</p>
    </section>
  );
}

export function LinksBlock({ netuid }: P) {
  const t = useT();
  const s = useSubnet(netuid).data?.subnet;
  const links = Object.entries(s?.links ?? {}).filter(([, v]) => !!v);
  if (!s || (!links.length && !s.team.length)) return null;
  return (
    <section className="card p-5">
      <h2 className="mb-2 text-[17px] font-bold">{t("learn.people")}</h2>
      <p className="text-[13px] text-muted">{s.team.length ? s.team.join(", ") : t("learn.seeSite")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold capitalize">{k}</a>)}
      </div>
    </section>
  );
}
