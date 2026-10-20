import { expect, type APIRequestContext, test } from "@playwright/test";

const MAILPIT_URL = "http://127.0.0.1:54324";

type MailpitAddress = { Address: string };
type MailpitMessage = {
  ID: string;
  Subject: string;
  To: MailpitAddress[];
};
type MailpitMessages = { messages: MailpitMessage[] };
type MailpitMessageDetail = { HTML?: string; Text?: string };

async function waitForMailLink(
  request: APIRequestContext,
  email: string,
  subject: string,
) {
  await expect
    .poll(
      async () => {
        const response = await request.get(`${MAILPIT_URL}/api/v1/messages`);

        if (!response.ok()) {
          return null;
        }

        const body = (await response.json()) as MailpitMessages;
        return (
          body.messages.find(
            (message) =>
              message.Subject.includes(subject) &&
              message.To.some((recipient) => recipient.Address === email),
          )?.ID ?? null
        );
      },
      { timeout: 15_000 },
    )
    .not.toBeNull();

  const messagesResponse = await request.get(`${MAILPIT_URL}/api/v1/messages`);
  const messages = (await messagesResponse.json()) as MailpitMessages;
  const message = messages.messages.find(
    (candidate) =>
      candidate.Subject.includes(subject) &&
      candidate.To.some((recipient) => recipient.Address === email),
  );

  if (!message) {
    throw new Error(`Mailpitに「${subject}」のメールが見つかりません。`);
  }

  const detailResponse = await request.get(
    `${MAILPIT_URL}/api/v1/message/${message.ID}`,
  );
  const detail = (await detailResponse.json()) as MailpitMessageDetail;
  const content = detail.HTML ?? detail.Text ?? "";
  const href = content.match(/href=["']([^"']+)["']/i)?.[1];

  if (!href) {
    throw new Error("認証メールにリンクが見つかりません。");
  }

  return href.replaceAll("&amp;", "&");
}

test("未認証ユーザーを保護ページからログインへ戻す", async ({ page }) => {
  await page.goto("/dashboard?view=all");

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%3Fview%3Dall$/);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
});

test("認証画面は375px幅で横スクロールしない", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  for (const path of [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/error",
  ]) {
    await page.goto(path);

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );

    expect(hasHorizontalOverflow, `${path} で横スクロールが発生`).toBe(false);
  }
});

test("不正な認証情報を日本語で表示する", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill("missing@example.test");
  await page.getByLabel("パスワード", { exact: true }).fill("invalid-password");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(
    page.getByText("メールアドレスまたはパスワードが正しくありません。"),
  ).toBeVisible();
});

test("不正なメール確認リンクをエラー画面へ送る", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=invalid&type=email");

  await expect(page).toHaveURL(/\/auth\/error$/);
  await expect(
    page.getByRole("heading", { name: "認証リンクを確認できませんでした" }),
  ).toBeVisible();
});

test("Auth APIも7文字のパスワードを拒否する", async ({ request }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabaseの公開環境変数が設定されていません。");
  }

  const response = await request.post(`${supabaseUrl}/auth/v1/signup`, {
    data: {
      email: `short-password-${Date.now()}@example.test`,
      password: "short-7",
    },
    headers: { apikey: publishableKey },
  });
  const body = (await response.json()) as {
    code?: number;
    error_code?: string;
  };

  expect(response.ok()).toBe(false);
  expect(response.status()).toBe(422);
  expect(body.error_code).toBe("weak_password");
});

test("回復セッションなしでは新しいパスワードを保存できない", async ({
  page,
}) => {
  await page.goto("/reset-password");

  await expect(
    page.getByText(/再設定セッションを確認できません/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "パスワードを更新" }),
  ).toHaveCount(0);
});

test("メール確認からログインとパスワード再設定まで完了できる", async ({
  browser,
  page,
  request,
}) => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `phase1b-${unique}@example.test`;
  const initialPassword = "SiteOps-pass-1";
  const newPassword = "SiteOps-pass-2";

  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill(initialPassword);
  await page.getByLabel("パスワード（確認）").fill(initialPassword);
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await expect(page.getByText("確認メールを送信しました")).toBeVisible();

  const confirmationLink = await waitForMailLink(
    request,
    email,
    "メールアドレスの確認",
  );
  await page.goto(confirmationLink);
  await expect(page.getByText("認証が完了しています")).toBeVisible();

  await page.goto("/reset-password");
  await expect(
    page.getByText(/再設定セッションを確認できません/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "パスワードを更新" }),
  ).toHaveCount(0);

  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("認証が完了しています")).toBeVisible();

  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill(initialPassword);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByText("認証が完了しています")).toBeVisible();

  const staleContext = await browser.newContext();
  const stalePage = await staleContext.newPage();
  await stalePage.goto("/login");
  await stalePage.getByLabel("メールアドレス").fill(email);
  await stalePage
    .getByLabel("パスワード", { exact: true })
    .fill(initialPassword);
  await stalePage.getByRole("button", { name: "ログイン" }).click();
  await expect(stalePage.getByText("認証が完了しています")).toBeVisible();

  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.getByRole("link", { name: "パスワードを忘れた方" }).click();
  await expect(
    page.getByRole("heading", { name: "パスワードを再設定" }),
  ).toBeVisible();
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByRole("button", { name: "再設定メールを送信" }).click();
  await expect(
    page.getByText(/パスワード再設定メールを送信しました/),
  ).toBeVisible();

  const recoveryLink = await waitForMailLink(
    request,
    email,
    "パスワード再設定",
  );
  await page.goto(recoveryLink);
  await expect(
    page.getByRole("heading", { name: "新しいパスワードを設定" }),
  ).toBeVisible();

  await page.getByLabel("新しいパスワード", { exact: true }).fill(newPassword);
  await page.getByLabel("新しいパスワード（確認）").fill(newPassword);
  await page.getByRole("button", { name: "パスワードを更新" }).click();
  await expect(page.getByText(/パスワードを更新しました/)).toBeVisible();

  await stalePage.goto("/login");
  await expect(
    stalePage.getByRole("heading", { name: "ログイン" }),
  ).toBeVisible();
  await staleContext.close();

  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill(initialPassword);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(
    page.getByText("メールアドレスまたはパスワードが正しくありません。"),
  ).toBeVisible();

  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByText("認証が完了しています")).toBeVisible();

  await page.goto(recoveryLink);
  await page
    .getByLabel("新しいパスワード", { exact: true })
    .fill("SiteOps-pass-3");
  await page.getByLabel("新しいパスワード（確認）").fill("SiteOps-pass-3");
  await page.getByRole("button", { name: "パスワードを更新" }).click();
  await expect(page.getByText(/再設定リンクが無効か/)).toBeVisible();

  await page.getByRole("link", { name: "ログインへ戻る" }).click();
  await expect(page).toHaveURL(/\/$/);
});
