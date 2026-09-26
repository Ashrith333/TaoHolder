import type { ButtonHTMLAttributes, ReactNode } from "react";

type Kind = "primary" | "secondary" | "ghost" | "danger";
const kinds: Record<Kind, string> = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  secondary: "bg-s2 text-text border border-line hover:bg-s3",
  ghost: "text-text hover:bg-s2",
  danger: "text-red border border-line hover:bg-red-soft",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { kind?: Kind; loading?: boolean; full?: boolean; small?: boolean; children: ReactNode };

/** Min height 48 (PRD 8.3). Disabled label should say why. */
export function Button({ kind = "primary", loading, full, small, className = "", disabled, children, ...rest }: Props) {
  const off = disabled || loading;
  return (
    <button
      {...rest}
      disabled={off}
      aria-busy={loading || undefined}
      className={`${small ? "min-h-9 px-3 text-[13px]" : "min-h-12 px-5 text-[15px]"} inline-flex items-center justify-center gap-2 rounded-[14px] font-bold transition-colors duration-150 ${
        off ? "cursor-not-allowed bg-s3 text-dim" : kinds[kind]
      } ${full ? "w-full" : ""} ${className}`}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}
