"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useConfig } from "@/providers/ConfigProvider";
import { useNav } from "@/stores/nav";

/** Remembers the last main-tab URL (tabs come from app.json) for the panel close button. */
export function NavTracker() {
  const { app } = useConfig();
  const path = usePathname();
  const params = useSearchParams();
  const setLastMain = useNav((s) => s.setLastMain);
  useEffect(() => {
    if (app.tabs.some((t) => path.startsWith(t.href))) {
      const q = params.toString();
      setLastMain(q ? `${path}?${q}` : path);
    }
  }, [path, params, app.tabs, setLastMain]);
  return null;
}
