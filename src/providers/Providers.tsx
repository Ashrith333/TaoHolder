"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ClientConfig } from "@/adapters/content/load";
import { ConfigProvider } from "./ConfigProvider";
import { ThemeSync } from "./ThemeSync";

export function Providers({ config, children }: { config: ClientConfig; children: React.ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: true, retry: 1 } } }),
  );
  return (
    <ConfigProvider value={config}>
      <QueryClientProvider client={qc}>
        <ThemeSync />
        {children}
      </QueryClientProvider>
    </ConfigProvider>
  );
}
