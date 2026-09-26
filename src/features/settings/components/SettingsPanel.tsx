"use client";
import { Button, Seg, Tag } from "@/components/ui";
import { useMoney } from "@/hooks/money";
import { useMounted } from "@/hooks/mounted";
import { useConfig, useT } from "@/providers/ConfigProvider";
import { useBookmarks } from "@/stores/bookmarks";
import { useSettings, type Theme } from "@/stores/settings";

/** S15: show first (D5), theme (D12), validator (D3, Later), network, clear bookmarks. */
export function SettingsPanel() {
  const t = useT();
  const cfg = useConfig();
  const mounted = useMounted();
  const s = useSettings();
  const money = useMoney();
  const clear = useBookmarks((b) => b.clear);
  const theme = (mounted ? s.theme : null) ?? cfg.features.defaultTheme;
  const preview = money.pair(412.6);
  const row = (label: string, body: React.ReactNode) => (
    <div className="flex flex-col gap-2 border-b border-line py-4 last:border-0 md:flex-row md:items-center md:justify-between">
      <span className="text-[14px] font-semibold">{label}</span>
      <div>{body}</div>
    </div>
  );
  return (
    <section className="mx-auto max-w-[640px] space-y-4">
      <h1 className="text-[22px] font-extrabold">{t("settings.title")}</h1>
      <div className="card px-4">
        {cfg.features.usdToggle
          ? row(t("settings.showFirst"), (
              <div className="space-y-2">
                <Seg label={t("settings.showFirst")} value={mounted ? s.showFirst : "tao"} onChange={s.setShowFirst} options={[{ value: "tao", label: t("settings.taoFirst") }, { value: "usd", label: t("settings.usdFirst") }]} />
                <p className="num text-[13px]"><span className="font-bold">{preview.primary}</span> {preview.secondary ? <span className="text-muted">{preview.secondary}</span> : null}</p>
              </div>
            ))
          : null}
        {row(t("settings.theme"), <Seg<Theme> label={t("settings.theme")} value={theme} onChange={s.setTheme} options={cfg.features.themes.map((v) => ({ value: v, label: t(`settings.theme.${v}`) }))} />)}
        {row(t("settings.validator"), <p className="text-[13px] text-muted">{t("settings.validatorBody")} <Tag>{t("settings.later")}</Tag></p>)}
        {row(t("settings.network"), <span className="text-[13px] font-bold capitalize">{cfg.network}</span>)}
        {row(t("settings.clearBookmarks"), <Button small kind="danger" onClick={clear}>{t("settings.clearBookmarks")}</Button>)}
      </div>
      <p className="text-[12px] text-muted">{t("settings.saved")}</p>
    </section>
  );
}
