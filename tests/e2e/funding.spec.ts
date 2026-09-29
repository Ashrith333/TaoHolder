import { expect, test } from "@playwright/test";
import { connectDemo } from "./helpers";

test("top up with ETH (demo route) then stake & invest the TAO", async ({ page }) => {
  test.setTimeout(60_000);
  await connectDemo(page);
  await page.goto("/trade");
  await page.getByRole("link", { name: /Top up with ETH/ }).click();
  await expect(page.getByRole("heading", { name: "Top up with another token" })).toBeVisible();
  await page.getByRole("button", { name: "ETH on Ethereum" }).click();
  await page.getByLabel("Amount").fill("1");
  await expect(page.getByText("You get about")).toBeVisible();
  await expect(page.getByText(/holds your funds for a few minutes/)).toBeVisible();
  await page.getByRole("button", { name: "Get deposit address" }).click();
  await expect(page.getByText(/Send exactly 1 ETH to this address/)).toBeVisible();
  await expect(page.getByText(/Only send ETH on Ethereum/)).toBeVisible();
  await expect(page.getByText("Waiting for your deposit")).toBeVisible();
  await page.getByRole("button", { name: "Demo: I've sent it" }).click();
  await expect(page.getByText("Swapping to TAO")).toBeVisible();
  await expect(page.getByText("TAO arrived").first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Stake & Invest it" }).click();
  await expect(page).toHaveURL(/\/trade\?amount=\d+\.\d+/);
  await expect(page.getByLabel("Amount").first()).not.toHaveValue("");
});

test("top up is in the menu and closes back", async ({ page }) => {
  await connectDemo(page);
  await page.goto("/learn");
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("link", { name: "Top up" }).click();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/\/learn/);
});
