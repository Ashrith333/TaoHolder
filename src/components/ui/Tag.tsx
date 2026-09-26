"use client";
import { useState } from "react";
import type { ImpactLevel } from "@/services/types";

type TagKind = ImpactLevel | "pool" | "like" | "neutral" | "solid";
const styles: Record<TagKind, string> = {
  low: "bg-s3 text-muted",
  medium: "border border-text text-text font-bold",
  high: "bg-red text-white font-bold",
  pool: "text-red bg-red-soft",
  like: "border border-line text-muted",
  neutral: "bg-s3 text-muted",
  solid: "bg-primary text-on-primary font-bold",
};

export function Tag({ kind = "neutral", children, title }: { kind?: TagKind; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex h-5 items-center whitespace-nowrap rounded-[6px] px-1.5 text-[11px] font-semibold ${styles[kind]}`}>
      {children}
    </span>
  );
}

/** Words first; tap shows the exact % (D14). */
export function ImpactTag({ level, label, exact }: { level: ImpactLevel; label: string; exact: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} aria-label={`${label}, ${exact}`} className="inline-flex items-center gap-1">
      <Tag kind={level}>{open ? exact : label}</Tag>
    </button>
  );
}
