/** Neutral badge with the netuid; root is solid/inverted (F4). */
export function Badge({ netuid, size = 38 }: { netuid: number; size?: number }) {
  const root = netuid === 0;
  return (
    <span
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-[10px] text-[11px] font-extrabold ${root ? "bg-primary text-on-primary" : "bg-s3 text-text"}`}
    >
      {root ? "R" : `SN${netuid}`}
    </span>
  );
}
