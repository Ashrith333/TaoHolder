/** Generic list row: left badge, title + meta, right value. Whole row is the tap target. */
export function Row({ left, title, meta, right, onClick, disabled, highlight }: {
  left?: React.ReactNode; title: React.ReactNode; meta?: React.ReactNode; right?: React.ReactNode;
  onClick?: () => void; disabled?: boolean; highlight?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      className={`flex min-h-14 w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left ${onClick ? "hover:bg-s2" : ""} ${disabled ? "opacity-50" : ""} ${highlight ? "flash" : ""}`}
    >
      {left}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{title}</span>
        {meta ? <span className="mt-0.5 block truncate text-[12px] text-muted">{meta}</span> : null}
      </span>
      {right}
    </Tag>
  );
}
