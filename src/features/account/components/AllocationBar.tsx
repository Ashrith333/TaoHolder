"use client";
import { useT } from "@/providers/ConfigProvider";
import { allocation } from "@/services/positions";
import { formatPct } from "@/services/format";
import { useAccount } from "../useAccount";

/** Stacked bar in grey shades: root darkest, subnets by size, free lightest (F4). */
export function AllocationBar() {
  const t = useT();
  const { data, empty, names } = useAccount();
  if (!data || empty) return null;
  const segs = allocation(data);
  const label = (k: string) => (k === "root" ? t("account.root") : k === "free" ? t("account.free") : names.get(Number(k.slice(2)))?.name ?? k.toUpperCase());
  return (
    <section className="card p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("account.allocation")}</p>
      <div className="flex h-3 overflow-hidden rounded-full bg-s2" role="img" aria-label={segs.map((s) => `${label(s.key)} ${formatPct(s.share, 0)}`).join(", ")}>
        {segs.map((s) => (
          <span key={s.key} style={{ width: `${s.share * 100}%`, background: `var(--g${s.shade})` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        {segs.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: `var(--g${s.shade})` }} />
            {label(s.key)} <span className="num">{formatPct(s.share, 0)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
