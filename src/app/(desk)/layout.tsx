import { loadConfig, toClientConfig } from "@/adapters/content/load";
import { Providers } from "@/providers/Providers";
import { Header } from "@/components/shell/Header";
import { BottomTabs } from "@/components/shell/BottomTabs";

export const revalidate = 60;

/** Header, tabs, providers. Config comes from Supabase (or content/ JSON) on the server. */
export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const config = toClientConfig(await loadConfig());
  return (
    <Providers config={config}>
      <Header />
      <main className="mx-auto max-w-[var(--max-w)] px-4 pb-24 pt-4 md:px-10 md:pb-16 md:pt-8 xl:px-[120px]">{children}</main>
      <BottomTabs />
    </Providers>
  );
}
