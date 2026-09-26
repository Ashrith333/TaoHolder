import { formatChange } from "@/services/format";

/** Gains bold with ▲; losses red with ▼ — never colour alone (F2). */
export function Change({ pct, className = "" }: { pct: number; className?: string }) {
  const c = formatChange(pct);
  return <span className={`num text-[12px] ${c.up ? "font-bold text-text" : "font-semibold text-red"} ${className}`}>{c.text}</span>;
}
