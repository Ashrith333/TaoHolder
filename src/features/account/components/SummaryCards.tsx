"use client";
import Link from "next/link";
import { useMoney } from "@/hooks/money";
import { useT } from "@/providers/ConfigProvider";
import { formatPct } from "@/services/format";
import { useAccount } from "../useAccount";

/** Staked TAO, In subnets, Free TAO row with Trade link. */
export function SummaryCards() {
  const t = useT();
  const money = useMoney();
  const { data, empty } = useAccount();
  if (!data || empty) return null;
  const total = Number(data.totalTao) || 1;
  const inSubnets = data.positions.reduce((s, p) => s + p.valueTao, 0n);
  const card = (label: string, rao: bigint, meta: string) => (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="num mt-1 text-[17px] font-bold">{money.pairRao(rao).primary}</p>
      <p className="mt-0.5 text-[12px] text-muted">{meta}</p>
    </div>
  );
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {card(t("account.staked"), data.root, t("account.ofTotal", { pct: formatPct(Number(data.root) / total, 0) }))}
        {card(t("account.inSubnets"), inSubnets, `${t("account.subnetsCount", { n: data.positions.length })} · ${formatPct(Number(inSubnets) / total, 0)}`)}
      </div>
      <div className="card flex items-center justify-between p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("account.free")}</p>
          <p className="num mt-1 text-[15px] font-bold">{money.pairRao(data.free).primary}</p>
        </div>
        <Link href="/trade" className="rounded-[12px] border border-line px-4 py-2.5 text-[13px] font-bold">{t("account.freeCta")}</Link>
      </div>
    </section>
  );
}
