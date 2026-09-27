import { expect, test } from "@playwright/test";
import { connectDemo } from "./helpers";

test("history: one clear card per transaction, stake and invest shown separately, failures marked", async ({ page }) => {
  await connectDemo(page);
  // A successful stake + invest
  await page.goto("/trade?amount=10");
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Confirm in wallet" }).click();
  await page.getByRole("button", { name: "Demo: approve" }).click();
  await expect(page.getByText("Done").first()).toBeVisible({ timeout: 8000 });
  // A failed one (price moved)
  await page.goto("/trade?stake=0&invest=1&amount=4");
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Confirm in wallet" }).click();
  await page.getByRole("button", { name: "Demo: prices moved" }).click();
  await expect(page.getByText(/Prices moved before your order landed/)).toBeVisible({ timeout: 8000 });

  await page.goto("/history");
  const list = page.getByRole("list").last();
  await expect(list.getByRole("button", { name: /Staked TAO \+ invested in 4 subnets/ }).first()).toBeVisible();
  await expect(list.getByRole("button", { name: /Invested in 4 subnets.*Failed/ }).first()).toBeVisible();
  await expect(page.getByText("Price moved past the limit. Nothing was spent.").first()).toBeVisible();
  // Real-data cases from the sample feed
  await expect(list.getByRole("button", { name: /Invested in 2 subnets.*Failed/ }).first()).toBeVisible();
  await expect(page.getByText("The validator is not registered.").first()).toBeVisible();
  await expect(list.getByRole("button", { name: /Validator updated automatically/ })).toBeVisible();
  await expect(list.getByRole("button", { name: /Received stake from another wallet/ }).first()).toBeVisible();
  await expect(list.getByRole("button", { name: /Sold from 1 subnet/ })).toBeVisible();

  await list.getByRole("button", { name: /Staked TAO \+ invested in 4 subnets/ }).first().click();
  await expect(page.getByText("Staked", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Invested", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Chutes/).first()).toBeVisible();

  await page.getByRole("button", { name: "Transfers" }).click();
  await expect(list.getByRole("button", { name: /Received TAO/ }).first()).toBeVisible();
  await expect(list.getByRole("button", { name: /Sent TAO/ }).first()).toBeVisible();
  await expect(list.getByRole("button", { name: /Staked TAO/ })).toHaveCount(0);
});
