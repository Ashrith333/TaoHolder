import { expect, test } from "@playwright/test";

// Fake Talisman extension. The local network has no RPC, so a real submit must fail
// with a visible reason (never hang silently), and the wallet must reconnect after reload.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { injectedWeb3: Record<string, unknown>; __enables: number };
    w.__enables = 0;
    w.injectedWeb3 = {
      talisman: {
        enable: async () => {
          w.__enables++;
          return {
            accounts: { get: async () => [{ address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", name: "Test" }] },
            signer: { signPayload: async () => ({ id: 1, signature: "0x00" }) },
          };
        },
      },
    };
  });
});

test("real wallet: failure is shown with Retry, and the signer is restored after reload", async ({ page }) => {
  await page.goto("/account");
  await page.getByRole("button", { name: "Connect wallet" }).first().click();
  await page.getByRole("listitem").filter({ hasText: "Talisman" }).getByRole("button", { name: "Connect" }).click();
  await expect(page.getByText("Total value")).toBeVisible();

  await page.goto("/trade?stake=1&invest=0&amount=1");
  await page.reload(); // signer is only in memory: this used to break Confirm
  await expect.poll(() => page.evaluate(() => (window as unknown as { __enables: number }).__enables)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Confirm in wallet" }).click();
  await expect(page.getByText(/Can't reach the Bittensor network right now/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});
