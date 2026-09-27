"use client";
import { ConnectCta } from "@/features/wallet";
import { useT } from "@/providers/ConfigProvider";
import { Logo } from "@/components/brand/Logo";

/** S01: explain the desk in one screen and get the wallet connected. */
export function AccountHero() {
  const t = useT();
  const cards = ["stake", "invest", "sell"] as const;
  return (
    <section className="fade-in mx-auto max-w-[560px] pt-6 text-center md:pt-16">
      <div className="mb-6 flex justify-center">
        <Logo className="text-[48px] md:text-[72px]" />
      </div>
      <h1 className="text-[26px] font-extrabold md:text-[34px]">{t("hero.title")}</h1>
      <p className="mx-auto mt-3 max-w-[40ch] text-[15px] text-muted">{t("hero.promise")}</p>
      <div className="mx-auto mt-6 max-w-[360px]">
        <ConnectCta />
        <p className="mt-3 text-[12px] text-muted">{t("hero.nonCustodial")}</p>
      </div>
      <ul className="mt-8 grid gap-3 text-left md:grid-cols-3">
        {cards.map((c) => (
          <li key={c} className="card p-4">
            <p className="text-[15px] font-bold">{t(`hero.card.${c}.title`)}</p>
            <p className="mt-1 text-[13px] text-muted">{t(`hero.card.${c}.body`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
