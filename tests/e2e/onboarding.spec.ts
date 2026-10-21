import { expect, test } from "@playwright/test";

test("未認証ユーザーをオンボーディングからログインへ戻す", async ({ page }) => {
  await page.goto("/onboarding");

  await expect(page).toHaveURL(/\/login\?next=%2Fonboarding$/);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
});

test("未認証のオンボーディングAPIを拒否する", async ({ request }) => {
  const [consentResponse, organizationResponse] = await Promise.all([
    request.post("/api/v1/onboarding/consent", {
      data: {
        acceptPrivacy: true,
        acceptTerms: true,
        privacyVersion: "test-only",
        termsVersion: "test-only",
      },
      headers: { origin: "http://localhost:3000" },
    }),
    request.post("/api/v1/onboarding", {
      data: { name: "E2Eテスト組織" },
      headers: { origin: "http://localhost:3000" },
    }),
  ]);

  expect(consentResponse.status()).toBe(401);
  expect(organizationResponse.status()).toBe(401);
});

test("正式文書が未登録なら準備中表示になり、375px幅で収まる", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });

  for (const path of ["/legal/terms", "/legal/privacy"]) {
    await page.goto(path);

    await expect(
      page.getByText("正式文書を準備中です。", { exact: false }),
    ).toBeVisible();
    await expect(page.getByText("0.1-draft")).toHaveCount(0);

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );

    expect(hasHorizontalOverflow, `${path} で横スクロールが発生`).toBe(false);
  }
});
