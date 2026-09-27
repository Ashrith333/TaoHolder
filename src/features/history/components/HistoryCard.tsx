"use client";
import { useState } from "react";
import { Badge, Tag } from "@/components/ui";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { formatTao, formatTokens, shortAddress } from "@/services/format";
import { groupLegs, summarize } from "@/services/history";
import type { HistoryLeg, HistoryTx } from "@/services/types";

type Props = { tx: HistoryTx; names: Map<number, string>; validatorNames: Map<string, string> };

/** One transaction: plain-words title, status, net TAO; tap for each subnet it touched. */
export function HistoryCard({ tx, names, validatorNames }: Props) {
  const t = useT();
  const { explorer } = useConfig();
  const [open, setOpen] = useState(false);
  const s = summarize(tx);
  const one = s.subnets === 1 && ["invest", "stakeInvest", "sell"].includes(s.kind);
  const title = t(`history.title.${s.kind}${one ? "1" : ""}`, { n: s.subnets });
  const failed = tx.status === "failed";
  const net = s.taoOut - s.taoIn;
  const amount = failed ? t("history.nothingSpent") : `${net >= 0 ? "+" : "−"}${formatTao(Math.abs(net))}`;
  const statusTag = tx.status === "done" ? "neutral" : tx.status === "failed" ? "high" : "medium";
  const href = tx.hash && explorer ? explorer.replace("{hash}", tx.hash) : null;
  const estimate = tx.legs.some((l) => l.estimate) && tx.status !== "failed";
  const g = groupLegs(tx);

  return (
    <li className="border-b border-line last:border-0">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-s2">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-s3 text-[15px] font-bold">
          {net > 0 ? "↓" : "↑"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-snug">{title}</span>
          <span className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
            {new Date(tx.time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            <Tag kind={statusTag}>{t(`history.status.${tx.status}`)}</Tag>
          </span>
        </span>
        <span className={`num text-right text-[14px] font-bold ${failed ? "text-muted" : ""}`}>{amount}</span>
      </button>
      {failed && tx.reason ? <p className="px-4 pb-3 pl-16 text-[12px] font-semibold text-red">{tx.reason}</p> : null}
      {open ? (
        <div className="fade-in space-y-3 px-4 pb-4 pl-16">
          {tx.transfer ? (
            <p className="text-[13px] text-muted">
              {t(tx.transfer.direction === "in" ? "history.from" : "history.to", { address: shortAddress(tx.transfer.counterparty) })}
            </p>
          ) : null}
          <Section title={t("history.section.stake")} legs={g.stake} render={(l) => <LegRow l={l} name={t("history.root")} v={validatorNames} />} />
          <Section title={t("history.section.invest")} legs={g.invest} render={(l) => <LegRow l={l} name={l.netuid == null ? t("history.unknownSubnet") : names.get(l.netuid) ?? `SN${l.netuid}`} v={validatorNames} />} />
          <Section title={t("history.section.sell")} legs={g.sell} render={(l) => <LegRow l={l} name={l.netuid == null ? t("history.unknownSubnet") : names.get(l.netuid) ?? `SN${l.netuid}`} v={validatorNames} />} />
          <Section title={t("history.section.unstake")} legs={g.unstake} render={(l) => <LegRow l={l} name={t("history.root")} v={validatorNames} />} />
          {tx.status === "pending" ? <p className="text-[12px] text-muted">{t("history.pendingNote")}</p> : null}
          {estimate ? <p className="text-[11.5px] text-dim">{t("history.estimate")}</p> : null}
          {href ? <a href={href} target="_blank" rel="noreferrer" className="inline-block text-[12px] font-semibold underline">{t("tx.explorer")}</a> : null}
        </div>
      ) : null}
    </li>
  );
}

function Section({ title, legs, render }: { title: string; legs: HistoryLeg[]; render: (l: HistoryLeg) => React.ReactNode }) {
  if (!legs.length) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      <ul className="space-y-1.5">{legs.map((l, i) => <li key={i}>{render(l)}</li>)}</ul>
    </div>
  );
}

function LegRow({ l, name, v }: { l: HistoryLeg; name: string; v: Map<string, string> }) {
  const t = useT();
  const validator = l.hotkey ? v.get(l.hotkey) ?? shortAddress(l.hotkey) : null;
  const selling = l.type === "sell";
  const tokens = l.tokens ? (selling ? t("history.sold", { x: formatTokens(l.tokens) }) : t(l.estimate ? "history.gotAbout" : "history.got", { x: formatTokens(l.tokens) })) : null;
  return (
    <div className="flex items-center gap-3 rounded-[10px] bg-s2 px-3 py-2">
      <Badge netuid={l.netuid ?? 0} size={30} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{name}{l.netuid ? <span className="text-muted"> SN{l.netuid}</span> : null}</p>
        <p className="truncate text-[11.5px] text-muted">{[selling ? tokens : null, validator ? t("history.via", { validator }) : null].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="text-right">
        <p className="num text-[13px] font-bold">{l.estimate ? "≈ " : ""}{formatTao(l.tao)}</p>
        {!selling && tokens ? <p className="num text-[11.5px] text-muted">{tokens}</p> : null}
      </div>
    </div>
  );
}
