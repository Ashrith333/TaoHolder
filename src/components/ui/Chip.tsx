"use client";

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
        on ? "bg-primary text-on-primary" : "border border-line bg-s2 text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">{children}</div>;
}
