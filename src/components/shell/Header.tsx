"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, WalletButton } from "@/features/wallet";
import { useConfig, useT } from "@/providers/ConfigProvider";

/** Top bar: mark, text tabs on laptop, Connect / address pill, menu. */
export function Header() {
  const t = useT();
  const { app, network } = useConfig();
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[var(--max-w)] items-center gap-6 px-4 md:h-16 md:px-10 xl:px-[120px]">
        <Link href="/account" className="flex items-baseline gap-0.5 text-[17px] font-extrabold">
          <span>tao</span><span className="text-muted">holder</span>
        </Link>
        {network !== "mainnet" ? <span className="rounded-[6px] bg-s3 px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">{network}</span> : null}
        <nav className="hidden flex-1 gap-6 md:flex">
          {app.tabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className={`text-[14px] font-semibold ${path.startsWith(tab.href) ? "text-text" : "text-muted hover:text-text"}`}>
              {t(tab.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <WalletButton />
          <Menu />
        </div>
      </div>
    </header>
  );
}
