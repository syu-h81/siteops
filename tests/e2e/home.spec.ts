import { expect, test } from "@playwright/test";

test("初期画面を日本語で表示できる", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Webサイト保守業務を、ひとつに。" }),
  ).toBeVisible();
});
