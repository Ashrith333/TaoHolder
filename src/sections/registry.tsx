"use client";
import type { ComponentType } from "react";
import { AccountHero, AllocationBar, PositionsList, SummaryCards, TotalCard } from "@/features/account";
import { TradeDesk } from "@/features/trade";
import { PreviewDesk } from "@/features/preview";
import { BusinessBlock, Catalog, LinksBlock, MarketBlock, SubnetHead } from "@/features/learn";
import { HistoryList } from "@/features/history";
import { SettingsPanel } from "@/features/settings";
import { Notice } from "./Notice";

// Section registry: layout config (Supabase page_sections or content/config/layout.json)
// names components by these keys. Replace a section by pointing its row at another key,
// or add a component here and reference it — pages never change.
export type SectionProps = Record<string, unknown> & { netuid?: number };

export const SECTIONS: Record<string, ComponentType<SectionProps>> = {
  "account.hero": AccountHero,
  "account.total": TotalCard,
  "account.cards": SummaryCards,
  "account.allocation": AllocationBar,
  "account.positions": PositionsList,
  "trade.desk": TradeDesk,
  "preview.desk": PreviewDesk,
  "learn.catalog": Catalog,
  "learn.subnetHead": ({ netuid }) => <SubnetHead netuid={netuid ?? 0} />,
  "learn.market": ({ netuid }) => <MarketBlock netuid={netuid ?? 0} />,
  "learn.business": ({ netuid }) => <BusinessBlock netuid={netuid ?? 0} />,
  "learn.links": ({ netuid }) => <LinksBlock netuid={netuid ?? 0} />,
  "history.list": HistoryList,
  "settings.panel": SettingsPanel,
  "common.notice": Notice,
};

export const sectionKeys = () => Object.keys(SECTIONS);
