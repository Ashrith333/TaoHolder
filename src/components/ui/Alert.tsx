type Kind = "note" | "red" | "success" | "warning";

/** Plain words, one action max. Warnings are always boxed (F3). */
export function Alert({ kind = "note", children, action }: { kind?: Kind; children: React.ReactNode; action?: React.ReactNode }) {
  const cls =
    kind === "red" || kind === "warning"
      ? "border-red bg-red-soft text-red font-semibold"
      : kind === "success"
        ? "border-text text-text"
        : "border-dashed border-line text-muted";
  return (
    <div role={kind === "red" ? "alert" : "note"} className={`flex items-start justify-between gap-3 rounded-[12px] border px-3.5 py-3 text-[13px] ${cls}`}>
      <div>{children}</div>
      {action}
    </div>
  );
}
