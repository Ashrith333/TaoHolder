export function Skeleton({ h = 16, w = "100%", className = "" }: { h?: number; w?: number | string; className?: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-md bg-s2 ${className}`} style={{ height: h, width: w }} />;
}
