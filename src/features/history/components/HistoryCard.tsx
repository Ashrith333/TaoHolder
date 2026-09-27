"use client";
import { useState } from "react";
import { Tag } from "@/components/ui";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { formatTao, formatTokens, shortAddress } from "@/services/format";
import { groupLegs, SECTIONS, summarize } from "@/services/history";
import type { HistoryTx } from "@/services/types";
import { LegRow } from "./LegRow";

type Props = { tx: HistoryTx; names: Map<number, string>; validatorNames: Map<string, string> };

/** One transaction: plain title, status, what it did to the wallet; tap for each subnet. */
export function HistoryCard({ tx, names, validatorNames }: Props) {
  const t = useT();
  const { explorer, errors } = useConfig();
  const [open, setOpen] = useState(false);
  const s = summarize(tx);
  const one = s.subnets === 1 && ["invest", "stakeInvest", "sell"].includes(s.kind);
  const title = t(`history.title.${s.kind}${one ? "1" : ""}`, { n: s.subnets });
  const failed = tx.status === "failed";
  const net = s.taoOut - s.taoIn;
  const amount = failed
    ? t("history.feeOnly", { x: formatTao(tx.fee ?? 0) })
    : s.kind === "validatorChange" || s.kind === "moved" || s.kind === "other"
      ? t("history.noChange")
      : s.kind === "receivedStake" || s.kind === "sentStake"
        ? `${s.kind === "receivedStake" ? "+" : "−"}${t("history.tokens", { x: formatTokens(s.tokens) })}`
        : `${net >= 0 ? "+" : "−"}${formatTao(Math.abs(net))}`;
  const incoming = s.kind === "received" || s.kind === "receivedStake" || (!failed && net > 0);
  const reason = failed ? (tx.reasonCode ? errors[tx.reasonCode] : undefined) ?? tx.reason ?? errors.default : null;
  const link = explorer && (tx.extrinsicId || tx.hash) ? explorer.replace("{hash}", tx.extrinsicId ?? tx.hash!) : null;
  const g = groupLegs(tx);
  const neutral = s.kind === "validatorChange" || s.kind === "moved" || s.kind === "other";

  return (
    <li className="border-b border-line last:border-0">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-s2">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-s3 text-[15px] font-bold">
          {failed ? "!" : neutral ? "⇄" : incoming ? "↓" : "↑"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-snug">{title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
            {new Date(tx.time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            <Tag kind={tx.status === "done" ? "neutral" : tx.status === "failed" ? "high" : "medium"}>{t(`history.status.${tx.status}`)}</Tag>
          </span>
        </span>
        <span className={`num shrink-0 text-right text-[14px] font-bold ${failed || neutral ? "text-muted" : ""}`}>{amount}</span>
      </button>
      {reason ? <p className="px-4 pb-3 pl-16 text-[12px] font-semibold text-red">{reason}</p> : null}
      {open ? (
        <div className="fade-in space-y-3 px-4 pb-4 pl-16">
          {tx.transfer ? <p className="text-[13px] text-muted">{t(tx.transfer.direction === "in" ? "history.from" : "history.to", { address: shortAddress(tx.transfer.counterparty) })}</p> : null}
          {SECTIONS.map((sec) =>
            g[sec].length ? (
              <div key={sec}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{t(`history.section.${sec}`)}</p>
                <ul className="space-y-1.5">{g[sec].map((l, i) => <li key={i}><LegRow l={l} names={names} validatorNames={validatorNames} /></li>)}</ul>
              </div>
            ) : null,
          )}
          {failed ? <p className="text-[12px] text-muted">{t("history.failedNote")}</p> : null}
          {s.kind === "validatorChange" ? <p className="text-[12px] text-muted">{t("history.validatorChangeNote")}</p> : null}
          {s.kind === "receivedStake" ? <p className="text-[12px] text-muted">{t("history.receivedStakeNote")}</p> : null}
          {s.kind === "other" ? <p className="text-[12px] text-muted">{t("history.otherNote", { call: tx.call ?? "?" })}</p> : null}
          {tx.status === "pending" ? <p className="text-[12px] text-muted">{t("history.pendingNote")}</p> : null}
          {!failed && tx.legs.some((l) => l.estimate) ? <p className="text-[11.5px] text-dim">{t("history.estimate")}</p> : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
            {tx.fee ? <span className="num text-muted">{t("history.fee", { x: formatTao(tx.fee) })}</span> : null}
            {link ? <a href={link} target="_blank" rel="noreferrer" className="font-semibold underline">{t("tx.explorer")}</a> : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}
