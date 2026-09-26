"use client";
import { track } from "@/adapters/analytics";
import { useMounted } from "@/hooks/mounted";
import { useT } from "@/providers/ConfigProvider";
import { ownerKey, useBookmarks, useOwnerBookmarks } from "@/stores/bookmarks";
import { useWallet } from "@/stores/wallet";

export function BookmarkStar({ netuid }: { netuid: number }) {
  const t = useT();
  const mounted = useMounted();
  const address = useWallet((s) => s.address);
  const list = useOwnerBookmarks(address);
  const toggle = useBookmarks((s) => s.toggle);
  const on = mounted && list.includes(netuid);
  return (
    <button
      aria-pressed={on}
      aria-label={t("learn.bookmark")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(ownerKey(address), netuid);
        track("bookmark_toggle", { netuid });
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-s2"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
