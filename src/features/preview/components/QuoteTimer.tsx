"use client";
import { useEffect, useState } from "react";
import { useT } from "@/providers/ConfigProvider";

/** Counts down to expiresAt; at 0 calls onExpire. Announced at 10 s left only (PRD 8.6). */
export function QuoteTimer({ expiresAt, onExpire, paused }: { expiresAt: number; onExpire: () => void; paused: boolean }) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [paused]);
  const left = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  useEffect(() => {
    if (!paused && left === 0) onExpire();
  }, [left, paused, onExpire]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <span className="num inline-flex h-8 items-center rounded-full border border-line px-3 text-[12px] font-bold">
      {left === 0 ? t("preview.expired") : t("preview.timer", { "mm:ss": `${mm}:${ss}` })}
      <span className="sr-only" aria-live="polite">{left === 10 ? "10 seconds left" : ""}</span>
    </span>
  );
}
