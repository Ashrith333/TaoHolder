"use client";
import Link from "next/link";
import { Alert, Change, Skeleton } from "@/components/ui";
import { useMoney } from "@/hooks/money";
import { useT } from "@/providers/ConfigProvider";
import { useAccount } from "../useAccount";

/** Header block: total value, USD small, 7d change. Empty → S04. */
export function TotalCard() {
  const t = useT();
  const { q, data, empty } = useAccount();
  const money = useMoney();
  if (q.isError) return <Alert kind="red">{t("account.delayed", { time: "—" })}</Alert>;
  if (!data) return <div className="card space-y-3 p-5"><Skeleton h={12} w={90} /><Skeleton h={38} w={220} /></div>;
  if (empty) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[17px] font-bold">{t("account.empty.title")}</p>
        <Link href="/trade" className="mt-4 inline-flex min-h-12 items-center rounded-[14px] bg-primary px-5 font-bold text-on-primary">{t("account.empty.cta")}</Link>
      </div>
    );
  }
  const pair = money.pairRao(data.totalTao);
  return (
    <section className="card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("account.total")}</p>
      <p className="num mt-1 text-[34px] font-extrabold leading-tight">{pair.primary}</p>
      <div className="mt-1 flex items-center gap-3">
        {pair.secondary ? <span className="num text-[13px] text-muted">{pair.secondary}</span> : null}
        <Change pct={data.change7d} />
        <span className="text-[12px] text-dim">7d</span>
      </div>
    </section>
  );
}
