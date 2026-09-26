import { defineConfig, devices } from "@playwright/test";

// E2E with the Demo wallet (local network, fixtures). Runs against `pnpm start` on PORT.
const port = Number(process.env.PORT ?? 3100);
const executablePath = process.env.PW_CHROMIUM ?? (process.env.PLAYWRIGHT_BROWSERS_PATH ? "/opt/pw-browsers/chromium" : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  use: { baseURL: `http://localhost:${port}`, launchOptions: executablePath ? { executablePath } : {} },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "laptop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: { command: `pnpm start -p ${port}`, port, reuseExistingServer: true, env: { NEXT_PUBLIC_CHAIN: "local" } },
});
