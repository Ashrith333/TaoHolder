"use client";
import { Badge } from "@/components/ui";
import { useT } from "@/providers/ConfigProvider";
import { formatTao, formatTokens, shortAddress } from "@/services/format";
import type { HistoryLeg } from "@/services/types";

/** One subnet line inside a History card. */
export function LegRow({ l, names, validatorNames }: { l: HistoryLeg; names: Map<number, string>; validatorNames: Map<string, string> }) {
  const t = useT();
  const subnet = (n: number | null | undefined) => (n == null ? t("history.unknownSubnet") : n === 0 ? t("history.root") : `${names.get(n) ?? "Subnet"} SN${n}`);
  const validator = l.validatorName ?? (l.hotkey ? validatorNames.get(l.hotkey) ?? shortAddress(l.hotkey) : null);
  const meta: string[] = [];
  if (l.type === "move" && l.fromNetuid != null && l.fromNetuid !== l.netuid) meta.push(t("history.moveFrom", { from: subnet(l.fromNetuid) }));
  if (l.type === "move" && l.fromHotkey && l.fromHotkey !== l.hotkey) meta.push(t("history.moveFrom", { from: validatorNames.get(l.fromHotkey) ?? shortAddress(l.fromHotkey) }));
  if (l.counterparty) meta.push(t(l.type === "receiveStake" ? "history.from" : "history.to", { address: shortAddress(l.counterparty) }));
  if (validator) meta.push(t("history.via", { validator }));
  if (l.estimate) meta.push(t("history.planned"));

  const selling = l.type === "sell" || l.type === "sendStake" || l.type === "move" || l.type === "receiveStake";
  const main = l.tao > 0 ? formatTao(l.tao) : l.tokens ? t("history.tokens", { x: formatTokens(l.tokens) }) : "—";
  const sub = l.tao > 0 && l.tokens ? (selling ? t("history.tokens", { x: formatTokens(l.tokens) }) : t("history.got", { x: formatTokens(l.tokens) })) : null;
  return (
    <div className="flex items-center gap-3 rounded-[10px] bg-s2 px-3 py-2">
      <Badge netuid={l.netuid ?? 0} size={30} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{subnet(l.netuid)}</p>
        {meta.length ? <p className="truncate text-[11.5px] text-muted">{meta.join(" · ")}</p> : null}
      </div>
      <div className="text-right">
        <p className="num text-[13px] font-bold">{main}</p>
        {sub ? <p className="num text-[11.5px] text-muted">{sub}</p> : null}
      </div>
    </div>
  );
}
