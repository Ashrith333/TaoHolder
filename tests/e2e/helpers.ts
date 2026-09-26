import { expect, type Page } from "@playwright/test";

export async function connectDemo(page: Page, mode: "ok" | "empty" = "ok") {
  await page.goto("/account");
  await page.getByRole("button", { name: "Connect wallet" }).first().click();
  await page.getByRole("button", { name: mode === "ok" ? "Demo wallet" : "Demo: empty account" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}
