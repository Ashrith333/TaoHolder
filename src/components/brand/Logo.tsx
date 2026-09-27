/** Wordmark: "tao" in the text colour, "holder" in grey. One source for every placement. */
/** Pass `size` in px, or leave it out and size it with a text-* class (e.g. responsive). */
export function Logo({ size, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-label="taoholder"
      className={`inline-flex items-baseline font-extrabold leading-none ${className}`}
      style={{ fontSize: size, letterSpacing: "-0.045em" }}
    >
      <span aria-hidden className="text-text">tao</span>
      <span aria-hidden style={{ color: "var(--logo-holder)" }}>holder</span>
    </span>
  );
}
