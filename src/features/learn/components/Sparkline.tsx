/** Hand-written SVG sparkline (no chart library). Stroke in the text colour. */
export function Sparkline({ points, height = 56, label }: { points: number[]; height?: number; label: string }) {
  if (points.length < 2) return null;
  const w = 300;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points.map((p, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * w).toFixed(1)},${(height - 4 - ((p - min) / span) * (height - 8)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-14 w-full" role="img" aria-label={label}>
      <path d={d} fill="none" stroke="var(--text)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
