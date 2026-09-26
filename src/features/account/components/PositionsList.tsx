"use client";
import { useRouter } from "next/navigation";
import { Badge, Change, Row } from "@/components/ui";
import { useMoney } from "@/hooks/money";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { resolveValidator } from "@/services/validators";
import { useAccount } from "../useAccount";

/** Root first, then subnets by value desc. Tap a subnet → /learn/[netuid] (v1). */
export function PositionsList() {
  const t = useT();
  const router = useRouter();
  const { validators } = useConfig();
  const money = useMoney();
  const { data, empty, names } = useAccount();
  if (!data || empty) return null;
  const rootV = resolveValidator(0, validators);
  const value = (rao: bigint, pct: number) => (
    <span className="text-right">
      <span className="num block text-[14px] font-bold">{money.pairRao(rao).primary}</span>
      <Change pct={pct} />
    </span>
  );
  return (
    <section className="card p-2">
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("account.positions")}</p>
      {data.root > 0n ? (
        <Row left={<Badge netuid={0} />} title={t("account.root")} meta={t("account.rootMeta", { validator: rootV?.name ?? "—" })} right={value(data.root, data.rootChange7d)} />
      ) : null}
      {data.positions.map((p) => {
        const s = names.get(p.netuid);
        return (
          <Row
            key={`${p.netuid}-${p.hotkey}`}
            left={<Badge netuid={p.netuid} />}
            title={s?.name ?? `SN${p.netuid}`}
            meta={`SN${p.netuid}${s ? ` · ${s.job}` : ""}`}
            right={value(p.valueTao, p.change7d)}
            onClick={() => router.push(`/learn/${p.netuid}`)}
          />
        );
      })}
    </section>
  );
}
