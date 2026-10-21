import { expect, test } from "@playwright/test";

test("未認証ユーザーをオンボーディングからログインへ戻す", async ({ page }) => {
  await page.goto("/onboarding");

  await expect(page).toHaveURL(/\/login\?next=%2Fonboarding$/);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
});
