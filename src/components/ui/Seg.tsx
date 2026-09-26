"use client";

type Option<T extends string> = { value: T; label: string };

/** Segmented control, max 5 options; selected = raised surface. */
export function Seg<T extends string>({ options, value, onChange, label, full }: { options: Option<T>[]; value: T; onChange: (v: T) => void; label: string; full?: boolean }) {
  return (
    <div role="tablist" aria-label={label} className={`inline-flex max-w-full overflow-x-auto rounded-[14px] bg-s2 p-1 no-scrollbar ${full ? "w-full" : ""}`}>
      {options.slice(0, 5).map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-10 flex-1 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-semibold transition-colors ${
            o.value === value ? "bg-s3 text-text shadow-sm" : "text-muted hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
