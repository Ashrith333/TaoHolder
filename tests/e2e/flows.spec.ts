import { expect, test } from "@playwright/test";
import { connectDemo } from "./helpers";

test("first visit → connect → account", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your TAO desk" })).toBeVisible();
  await connectDemo(page);
  await expect(page.getByText("Total value")).toBeVisible();
  await expect(page.getByText("Positions")).toBeVisible();
  await expect(page.getByRole("button", { name: /Chutes/ })).toBeVisible();
});

test("locked wallet shows an error; empty account shows empty state", async ({ page }) => {
  await page.goto("/account");
  await page.getByRole("button", { name: "Connect wallet" }).first().click();
  await page.getByRole("button", { name: "Demo: wallet locked" }).click();
  await expect(page.getByText("Unlock your wallet and try again")).toBeVisible();
  await page.getByRole("button", { name: "Demo: empty account" }).click();
  await expect(page.getByText("Nothing here yet")).toBeVisible();
});

test("stake + invest → review → approve → done", async ({ page }) => {
  await connectDemo(page);
  await page.goto("/trade");
  await page.getByLabel("Amount").first().fill("50");
  await expect(page.getByText(/50\.00 TAO = 15\.00 stake/)).toBeVisible();
  await expect(page.getByText(/thin pool: SN56/)).toBeVisible();
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText(/Quote 00:/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm in wallet" }).click();
  await page.getByRole("button", { name: "Demo: approve" }).click();
  await expect(page.getByText("Done")).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("link", { name: "View Account" })).toBeVisible();
});

test("prices moved → re-quote with changed leg → continue", async ({ page }) => {
  await connectDemo(page);
  await page.goto("/trade");
  await page.getByLabel("Amount").first().fill("40");
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Confirm in wallet" }).click();
  await page.getByRole("button", { name: "Demo: prices moved" }).click();
  await expect(page.getByText("Prices moved before your order landed. Nothing was spent.")).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("button", { name: /Remove / }).first()).toBeVisible();
  await page.getByRole("button", { name: "Continue with new prices" }).click();
  await expect(page.getByText("Waiting for your wallet")).toBeVisible();
});

test("wallet reject → nothing sent", async ({ page }) => {
  await connectDemo(page);
  await page.goto("/trade?stake=1&invest=0&amount=5");
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Confirm in wallet" }).click();
  await page.getByRole("button", { name: "Demo: reject" }).click();
  await expect(page.getByText("You cancelled in the wallet. Nothing was sent.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm again" })).toBeVisible();
});

test("custom split blocks review until placed", async ({ page }) => {
  await connectDemo(page);
  await page.goto("/trade?stake=0&invest=1&amount=10");
  await page.getByRole("tab", { name: "Custom" }).click();
  await page.getByLabel("Amount for 64").fill("4");
  await expect(page.getByRole("button", { name: /Place 6 TAO to continue/ })).toBeDisabled();
});

test("sell half → review sale", async ({ page }) => {
  await connectDemo(page);
  await page.goto("/trade?tab=sell");
  await page.getByRole("checkbox", { name: /Celium/ }).click();
  await expect(page.getByText(/of .* stays/)).toBeVisible();
  await page.getByRole("button", { name: "Review sale" }).click();
  await expect(page.getByRole("heading", { name: "Review sale" })).toBeVisible();
});

test("learn → subnet page → invest this preselects", async ({ page }) => {
  await page.goto("/learn");
  await page.getByPlaceholder("Search name, SN, job or company").fill("chutes");
  await page.getByRole("link", { name: /Chutes/ }).click();
  await expect(page.getByText("Label for context only, not a valuation")).toBeVisible();
  await page.getByRole("link", { name: "Invest this" }).click();
  await expect(page).toHaveURL(/select=64/);
});

test("settings: USD first and light theme", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("tab", { name: "USD first" }).click();
  await expect(page.getByText(/^\$[\d,]+/).first()).toBeVisible();
  await page.getByRole("tab", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
