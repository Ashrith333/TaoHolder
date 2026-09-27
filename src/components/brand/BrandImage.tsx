/** Wordmark on black for generated images (app icon, link previews). Rendered by next/og. */
export function BrandImage({ size, sub }: { size: number; sub?: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0a0a", fontFamily: "Inter" }}>
      <div style={{ display: "flex", fontSize: size, fontWeight: 800, letterSpacing: -size * 0.045, lineHeight: 1 }}>
        <span style={{ color: "#ffffff" }}>tao</span>
        <span style={{ color: "#7b8089" }}>holder</span>
      </div>
      {sub ? <div style={{ marginTop: size * 0.35, fontSize: size * 0.24, fontWeight: 400, color: "#a3a3a3" }}>{sub}</div> : null}
    </div>
  );
}
