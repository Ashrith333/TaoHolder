export function Checkbox({ on, disabled }: { on: boolean; disabled?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border ${
        on ? "border-primary bg-primary text-on-primary" : "border-dim"
      } ${disabled ? "opacity-40" : ""}`}
    >
      {on ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : null}
    </span>
  );
}
