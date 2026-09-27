"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/providers/ConfigProvider";
import { useNav } from "@/stores/nav";

/** Secondary screens (History, Settings, Legal) open as a card with ✕ back to the last main tab. */
export function PanelFrame({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const lastMain = useNav((s) => s.lastMain);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.push(lastMain);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, lastMain]);
  return (
    <div className="fade-in relative mx-auto max-w-[800px] rounded-[20px] border border-line bg-bg p-4 pt-5 md:p-6">
      <button
        onClick={() => router.push(lastMain)}
        aria-label={t("common.close")}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-s2 hover:bg-s3 md:right-4 md:top-4"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      {children}
    </div>
  );
}
