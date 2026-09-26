"use client";
import { Suspense } from "react";
import { ConnectCta } from "@/features/wallet";
import { useMounted } from "@/hooks/mounted";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { useWallet } from "@/stores/wallet";
import { SECTIONS, type SectionProps } from "./registry";

/** Renders the enabled sections for a page, in order, with their props from config. */
export function PageSections({ page, context = {} }: { page: string; context?: SectionProps }) {
  const t = useT();
  const { sections } = useConfig();
  const mounted = useMounted();
  const connected = useWallet((s) => !!s.address) && mounted;
  const rows = sections.filter((s) => s.page === page);
  const gated = rows.length > 0 && rows.every((s) => s.props.when === "connected");
  if (gated && mounted && !connected) {
    return (
      <div className="card mx-auto max-w-[420px] p-6 text-center">
        <p className="mb-4 text-muted">{t("trade.connectFirst")}</p>
        <ConnectCta />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {rows.map((s) => {
        const when = s.props.when;
        if (!mounted && when) return null;
        if (when === "connected" && !connected) return null;
        if (when === "disconnected" && connected) return null;
        const C = SECTIONS[s.component];
        if (!C) {
          if (process.env.NODE_ENV !== "production") console.warn(`[sections] unknown component "${s.component}" in ${s.id}`);
          return null;
        }
        return (
          <Suspense key={s.id} fallback={null}>
            <C {...s.props} {...context} />
          </Suspense>
        );
      })}
    </div>
  );
}
