"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConfig, useT } from "@/providers/ConfigProvider";

const ICONS: Record<string, string> = {
  "/account": "M4 5h16v14H4zM4 9h16",
  "/trade": "M7 7h13l-3-3M17 17H4l3 3",
  "/learn": "M4 5h7v14H4zM13 5h7v14h-7z",
};

/** Bottom bar on phone (under 768 px): Account, Trade, Learn. */
export function BottomTabs() {
  const t = useT();
  const { app } = useConfig();
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-line bg-bg md:hidden" aria-label="Main">
      {app.tabs.map((tab) => {
        const on = path.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} aria-current={on ? "page" : undefined} className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${on ? "text-text" : "text-dim"}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path d={ICONS[tab.href] ?? "M4 12h16"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
