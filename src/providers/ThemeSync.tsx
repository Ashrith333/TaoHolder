"use client";
import { useEffect } from "react";
import { useSettings } from "@/stores/settings";
import { useConfig } from "./ConfigProvider";

/** Applies Dark / Light / Auto to <html data-theme> (D12). */
export function ThemeSync() {
  const { features } = useConfig();
  const theme = useSettings((s) => s.theme) ?? features.defaultTheme;
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const t = theme === "auto" ? (mq.matches ? "light" : "dark") : theme;
      document.documentElement.dataset.theme = t;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  return null;
}
