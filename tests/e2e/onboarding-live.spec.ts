import { execFileSync } from "node:child_process";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  expect,
  request as playwrightRequest,
  type APIRequestContext,
  test,
} from "@playwright/test";

const RUN_LIVE_TESTS = process.env.RUN_ONBOARDING_LIVE_E2E === "1";
const APP_URL = "http://localhost:3000";
const V1_TERMS_ID = "11111111-1111-4111-8111-111111111111";
const V1_PRIVACY_ID = "22222222-2222-4222-8222-222222222222";
const V2_TERMS_ID = "33333333-3333-4333-8333-333333333333";
const V2_PRIVACY_ID = "44444444-4444-4444-8444-444444444444";

type MailpitAddress = { Address: string };
type MailpitMessage = {
  ID: string;
  Subject: string;
  To: MailpitAddress[];
};
type MailpitMessages = { messages: MailpitMessage[] };
type MailpitMessageDetail = { HTML?: string; Text?: string };

function requiredEnvironment(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the isolated live E2E test.`);
  }

  return value;
}

async function waitForMailLink(
  request: APIRequestContext,
  email: string,
  subject: string,
) {
  const mailpitUrl = requiredEnvironment("TEST_MAILPIT_URL");

  await expect
    .poll(
      async () => {
        const response = await request.get(`${mailpitUrl}/api/v1/messages`);
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

  const response = await request.get(`${mailpitUrl}/api/v1/messages`);
  const messages = (await response.json()) as MailpitMessages;
  const message = messages.messages.find(
    (candidate) =>
      candidate.Subject.includes(subject) &&
      candidate.To.some((recipient) => recipient.Address === email),
  );

  if (!message) {
    throw new Error("Confirmation mail was not delivered to isolated Mailpit.");
  }

  const detailResponse = await request.get(
    `${mailpitUrl}/api/v1/message/${message.ID}`,
  );
  const detail = (await detailResponse.json()) as MailpitMessageDetail;
  const content = detail.HTML ?? detail.Text ?? "";
  const href = content.match(/href=["']([^"']+)["']/i)?.[1];

  if (!href) {
    throw new Error("Confirmation link was not found in the Mailpit message.");
  }

  return href.replaceAll("&amp;", "&");
}

async function insertOne(
  client: SupabaseClient,
  table: string,
  values: Record<string, unknown>,
) {
  const { data, error } = await client
    .from(table)
    .insert(values)
    .select("*")
    .single();

  expect(error, `${table} insert failed`).toBeNull();
  expect(data).not.toBeNull();

  const row = data as Record<string, unknown>;

  if (typeof row.id !== "string") {
    throw new Error(`${table} insert did not return an id.`);
  }

  return row;
}

function switchCurrentDocuments(termsId: string, privacyId: string) {
  const databaseUrl = requiredEnvironment("TEST_DATABASE_URL");
  const sql = [
    "begin",
    `select public.set_current_legal_document('terms', '${termsId}'::uuid)`,
    `select public.set_current_legal_document('privacy', '${privacyId}'::uuid)`,
    "commit",
  ].join("; ");

  execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", sql], {
    stdio: "pipe",
  });
}

async function ensureIsolatedLegalFixtures(admin: SupabaseClient) {
  const fixtureIds = [V1_TERMS_ID, V1_PRIVACY_ID, V2_TERMS_ID, V2_PRIVACY_ID];
  const { data: existingFixtures, error: existingFixturesError } = await admin
    .from("legal_document_versions")
    .select("id")
    .in("id", fixtureIds);

  expect(existingFixturesError).toBeNull();

  if (existingFixtures?.length === 0) {
    const { error } = await admin.from("legal_document_versions").insert([
      {
        content_hash: "0".repeat(64),
        content_markdown:
          "# テスト利用規約 v1\n\n統合テスト専用の利用規約本文です。\n",
        content_path: "docs/legal/test/integration-terms-1.md",
        document_type: "terms",
        effective_at: "2026-01-01T00:00:00.000Z",
        id: V1_TERMS_ID,
        is_current: true,
        publication_status: "published",
        published_at: "2026-01-01T00:00:00.000Z",
        version: "integration-1",
      },
      {
        content_hash: "0".repeat(64),
        content_markdown:
          "# テストプライバシーポリシー v1\n\n統合テスト専用のポリシー本文です。\n",
        content_path: "docs/legal/test/integration-privacy-1.md",
        document_type: "privacy",
        effective_at: "2026-01-01T00:00:00.000Z",
        id: V1_PRIVACY_ID,
        is_current: true,
        publication_status: "published",
        published_at: "2026-01-01T00:00:00.000Z",
        version: "integration-1",
      },
      {
        content_hash: "0".repeat(64),
        content_markdown:
          "# テスト利用規約 v2\n\n再同意テスト専用の利用規約本文です。\n",
        content_path: "docs/legal/test/integration-terms-2.md",
        document_type: "terms",
        effective_at: "2026-01-02T00:00:00.000Z",
        id: V2_TERMS_ID,
        is_current: false,
        publication_status: "published",
        published_at: "2026-01-02T00:00:00.000Z",
        version: "integration-2",
      },
      {
        content_hash: "0".repeat(64),
        content_markdown:
          "# テストプライバシーポリシー v2\n\n再同意テスト専用のポリシー本文です。\n",
        content_path: "docs/legal/test/integration-privacy-2.md",
        document_type: "privacy",
        effective_at: "2026-01-02T00:00:00.000Z",
        id: V2_PRIVACY_ID,
        is_current: false,
        publication_status: "published",
        published_at: "2026-01-02T00:00:00.000Z",
        version: "integration-2",
      },
    ]);

    expect(error).toBeNull();
    return;
  }

  expect(existingFixtures).toHaveLength(4);
}

test.describe("分離Supabaseを使うオンボーディング統合テスト", () => {
  test.skip(
    !RUN_LIVE_TESTS,
    "RUN_ONBOARDING_LIVE_E2E=1 の分離環境でのみ実行します。",
  );
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  test("登録から再同意、Data API RLS、セッション破棄まで確認する", async ({
    page,
    request,
  }) => {
    const supabaseUrl = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
    const publishableKey = requiredEnvironment(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
    const serviceRoleKey = requiredEnvironment(
      "TEST_SUPABASE_SERVICE_ROLE_KEY",
    );
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const directUserClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false },
    });
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `onboarding-live-${unique}@example.test`;
    const password = "SiteOps-live-pass-1";

    await ensureIsolatedLegalFixtures(admin);
    switchCurrentDocuments(V1_TERMS_ID, V1_PRIVACY_ID);

    await page.goto("/signup");
    await page.getByLabel("メールアドレス").fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill(password);
    await page.getByLabel("パスワード（確認）").fill(password);
    await page.getByRole("button", { name: "アカウントを作成" }).click();
    await expect(page.getByText("確認メールを送信しました")).toBeVisible();

    const confirmationLink = await waitForMailLink(
      request,
      email,
      "メールアドレスの確認",
    );
    await page.goto(confirmationLink);
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole("heading", { name: "法務文書への同意が必要です" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "ログアウト" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("メールアドレス").fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill(password);
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.goto("/legal/terms");
    await expect(page.getByText("テスト利用規約 v1")).toBeVisible();
    await page.goto("/legal/privacy");
    await expect(page.getByText("テストプライバシーポリシー v1")).toBeVisible();
    await page.goto("/onboarding");
    await page.setViewportSize({ width: 375, height: 812 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);

    const { data: v1Documents, error: v1DocumentsError } = await admin
      .from("legal_document_versions")
      .select("id, document_type, content_hash")
      .in("id", [V1_TERMS_ID, V1_PRIVACY_ID]);
    expect(v1DocumentsError).toBeNull();
    const v1Terms = v1Documents?.find(
      (document) => document.document_type === "terms",
    );
    const v1Privacy = v1Documents?.find(
      (document) => document.document_type === "privacy",
    );

    if (!v1Terms || !v1Privacy) {
      throw new Error("The isolated v1 legal fixtures are missing.");
    }

    const consentPayload = {
      privacyAccepted: true,
      privacyContentHash: v1Privacy.content_hash,
      privacyDocumentId: v1Privacy.id,
      termsAccepted: true,
      termsContentHash: v1Terms.content_hash,
      termsDocumentId: v1Terms.id,
    };
    const browserCookies = await page.context().cookies();
    const cookieHeader = browserCookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    const rawApi = await playwrightRequest.newContext({
      baseURL: APP_URL,
      extraHTTPHeaders: { cookie: cookieHeader },
    });

    expect(
      (
        await rawApi.post("/api/v1/onboarding/consent", {
          data: consentPayload,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await rawApi.post("/api/v1/onboarding/consent", {
          data: consentPayload,
          headers: { origin: "https://attacker.example" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await rawApi.post("/api/v1/onboarding/consent", {
          data: JSON.stringify(consentPayload),
          headers: {
            "content-type": "text/plain",
            origin: APP_URL,
          },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await rawApi.post("/api/v1/onboarding/consent", {
          data: {
            ...consentPayload,
            termsDocumentId: "99999999-9999-4999-8999-999999999999",
          },
          headers: { origin: APP_URL },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await rawApi.post("/api/v1/onboarding/consent", {
          data: { ...consentPayload, termsContentHash: "0".repeat(64) },
          headers: { origin: APP_URL },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await rawApi.post("/api/v1/onboarding/consent", {
          data: "{",
          headers: {
            "content-type": "application/json",
            origin: APP_URL,
          },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await rawApi.post("/api/v1/onboarding/consent", {
          data: { ...consentPayload, unexpected: true },
          headers: { origin: APP_URL },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await rawApi.post("/api/v1/onboarding/consent", {
          data: {
            ...consentPayload,
            termsContentHash: "not-a-hash",
            termsDocumentId: "not-a-uuid",
          },
          headers: { origin: APP_URL },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await rawApi.post("/api/v1/onboarding/consent", {
          data: { ...consentPayload, privacyAccepted: false },
          headers: { origin: APP_URL },
        })
      ).status(),
    ).toBe(400);
    await rawApi.dispose();

    await expect(
      page.getByRole("button", { name: "同意して次へ" }),
    ).toBeDisabled();
    await page.getByLabel("利用規約に同意します").check();
    await page.getByLabel("プライバシーポリシーに同意します").check();
    await page.getByRole("button", { name: "同意して次へ" }).click();
    await expect(
      page.getByRole("heading", { name: "組織の初期設定が必要です" }),
    ).toBeVisible();

    const { data: signInData, error: signInError } =
      await directUserClient.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
    const userId = signInData.user?.id;

    if (!userId) {
      throw new Error("The direct Data API session has no user id.");
    }

    const { count: consentCount, error: consentCountError } = await admin
      .from("user_legal_consents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    expect(consentCountError).toBeNull();
    expect(consentCount).toBe(2);

    const idempotentConsentResponses = await Promise.all([
      page.request.post("/api/v1/onboarding/consent", {
        data: consentPayload,
        headers: { origin: APP_URL },
      }),
      page.request.post("/api/v1/onboarding/consent", {
        data: consentPayload,
        headers: { origin: APP_URL },
      }),
    ]);
    expect(
      idempotentConsentResponses.map((response) => response.status()),
    ).toEqual([200, 200]);
    const { count: idempotentConsentCount } = await admin
      .from("user_legal_consents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    expect(idempotentConsentCount).toBe(2);

    await page.getByLabel("組織名").fill("統合テスト組織");
    const organizationCookies = await page.context().cookies();
    const organizationApi = await playwrightRequest.newContext({
      baseURL: APP_URL,
      extraHTTPHeaders: {
        cookie: organizationCookies
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join("; "),
      },
    });
    expect(
      (
        await organizationApi.post("/api/v1/onboarding", {
          data: { name: "Origin欠落" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await organizationApi.post("/api/v1/onboarding", {
          data: { name: "不正Origin" },
          headers: { origin: "https://attacker.example" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await organizationApi.post("/api/v1/onboarding", {
          data: JSON.stringify({ name: "Content-Type不正" }),
          headers: { "content-type": "text/plain", origin: APP_URL },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await organizationApi.post("/api/v1/onboarding", {
          data: "{",
          headers: { "content-type": "application/json", origin: APP_URL },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await organizationApi.post("/api/v1/onboarding", {
          data: { name: "余計な項目", unexpected: true },
          headers: { origin: APP_URL },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await organizationApi.post("/api/v1/onboarding", {
          data: { name: "   " },
          headers: { origin: APP_URL },
        })
      ).status(),
    ).toBe(400);
    await organizationApi.dispose();

    const organizationStatuses = await page.evaluate(async () => {
      const requestOrganization = () =>
        fetch("/api/v1/onboarding", {
          body: JSON.stringify({ name: "統合テスト組織" }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }).then((response) => response.status);

      return Promise.all([requestOrganization(), requestOrganization()]);
    });
    expect(organizationStatuses.sort()).toEqual([201, 409]);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "ダッシュボード" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ログアウト" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(
      page.getByRole("button", { name: "ログアウト" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);

    const { data: organizations, error: organizationsError } = await admin
      .from("organizations")
      .select("id, owner_user_id")
      .eq("owner_user_id", userId);
    expect(organizationsError).toBeNull();
    expect(organizations).toHaveLength(1);
    expect(organizations?.[0]?.owner_user_id).toBe(userId);
    const organizationId = organizations?.[0]?.id;

    if (!organizationId) {
      throw new Error("The organization was not created.");
    }

    expect(
      (
        await page.request.post("/api/v1/onboarding", {
          data: { name: "重複組織" },
          headers: { origin: APP_URL },
        })
      ).status(),
    ).toBe(409);

    const client = await insertOne(directUserClient, "clients", {
      name: "自組織顧客",
      organization_id: organizationId,
    });
    const site = await insertOne(directUserClient, "sites", {
      client_id: client.id,
      name: "自組織サイト",
      organization_id: organizationId,
      url: "https://own.example.test",
    });
    const service = await insertOne(directUserClient, "site_services", {
      organization_id: organizationId,
      site_id: site.id,
      type: "domain",
    });
    const contract = await insertOne(
      directUserClient,
      "maintenance_contracts",
      {
        client_id: client.id,
        monthly_price_jpy: 10000,
        name: "自組織保守契約",
        organization_id: organizationId,
        start_date: "2026-01-01",
        status: "active",
      },
    );
    const task = await insertOne(directUserClient, "maintenance_tasks", {
      organization_id: organizationId,
      site_id: site.id,
      title: "自組織タスク",
    });
    const workLog = await insertOne(directUserClient, "work_logs", {
      organization_id: organizationId,
      site_id: site.id,
      title: "自組織作業",
      worked_minutes: 30,
      worked_on: "2026-10-23",
    });
    const ownRows = [
      ["clients", client.id],
      ["sites", site.id],
      ["site_services", service.id],
      ["maintenance_contracts", contract.id],
      ["maintenance_tasks", task.id],
      ["work_logs", workLog.id],
    ] as const;

    const otherEmail = `other-${unique}@example.test`;
    const { data: otherAuthData, error: otherAuthError } =
      await admin.auth.admin.createUser({
        email: otherEmail,
        email_confirm: true,
        password,
      });
    expect(otherAuthError).toBeNull();
    const otherUserId = otherAuthData.user?.id;

    if (!otherUserId) {
      throw new Error("The other test user was not created.");
    }

    const otherOrganization = await insertOne(admin, "organizations", {
      name: "別組織",
      owner_user_id: otherUserId,
    });
    const otherClient = await insertOne(admin, "clients", {
      name: "別組織顧客",
      organization_id: otherOrganization.id,
    });
    const otherSite = await insertOne(admin, "sites", {
      client_id: otherClient.id,
      name: "別組織サイト",
      organization_id: otherOrganization.id,
      url: "https://other.example.test",
    });
    const otherRows = [
      ["clients", otherClient.id],
      ["sites", otherSite.id],
      [
        "site_services",
        (
          await insertOne(admin, "site_services", {
            organization_id: otherOrganization.id,
            site_id: otherSite.id,
            type: "dns",
          })
        ).id,
      ],
      [
        "maintenance_contracts",
        (
          await insertOne(admin, "maintenance_contracts", {
            client_id: otherClient.id,
            monthly_price_jpy: 20000,
            name: "別組織保守契約",
            organization_id: otherOrganization.id,
            start_date: "2026-01-01",
            status: "active",
          })
        ).id,
      ],
      [
        "maintenance_tasks",
        (
          await insertOne(admin, "maintenance_tasks", {
            organization_id: otherOrganization.id,
            site_id: otherSite.id,
            title: "別組織タスク",
          })
        ).id,
      ],
      [
        "work_logs",
        (
          await insertOne(admin, "work_logs", {
            created_by: otherUserId,
            organization_id: otherOrganization.id,
            site_id: otherSite.id,
            title: "別組織作業",
            worked_minutes: 45,
            worked_on: "2026-10-23",
          })
        ).id,
      ],
    ] as const;

    const { error: oldRpcError } = await directUserClient.rpc(
      "accept_current_legal_documents",
    );
    expect(oldRpcError).not.toBeNull();
    const { error: wrongHashError } = await directUserClient.rpc(
      "accept_legal_documents",
      {
        p_privacy_content_hash: "0".repeat(64),
        p_privacy_document_id: V1_PRIVACY_ID,
        p_terms_content_hash: "0".repeat(64),
        p_terms_document_id: V1_TERMS_ID,
      },
    );
    expect(wrongHashError).not.toBeNull();

    switchCurrentDocuments(V2_TERMS_ID, V2_PRIVACY_ID);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByText("バージョン integration-2")).toHaveCount(2);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);

    const { data: readableDocuments, error: readableDocumentsError } =
      await directUserClient
        .from("legal_document_versions")
        .select("id")
        .eq("is_current", true);
    expect(readableDocumentsError).toBeNull();
    expect(readableDocuments).toHaveLength(2);
    const { data: readableConsents, error: readableConsentsError } =
      await directUserClient
        .from("user_legal_consents")
        .select("id")
        .eq("user_id", userId);
    expect(readableConsentsError).toBeNull();
    expect(readableConsents).toHaveLength(2);

    const { data: hiddenOrganizations, error: hiddenOrganizationsError } =
      await directUserClient
        .from("organizations")
        .select("id")
        .eq("id", organizationId);
    expect(hiddenOrganizationsError).toBeNull();
    expect(hiddenOrganizations).toEqual([]);

    for (const [table, id] of ownRows) {
      const selectResult = await directUserClient
        .from(table)
        .select("id")
        .eq("id", id);
      expect(selectResult.error, `${table} gated SELECT`).toBeNull();
      expect(selectResult.data, `${table} gated SELECT`).toEqual([]);

      const updateResult = await directUserClient
        .from(table)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id");
      expect(updateResult.error, `${table} gated UPDATE`).toBeNull();
      expect(updateResult.data, `${table} gated UPDATE`).toEqual([]);

      const deleteResult = await directUserClient
        .from(table)
        .delete()
        .eq("id", id)
        .select("id");
      expect(deleteResult.error, `${table} gated DELETE`).toBeNull();
      expect(deleteResult.data, `${table} gated DELETE`).toEqual([]);
    }

    const deniedInserts: ReadonlyArray<
      readonly [string, Record<string, unknown>]
    > = [
      ["clients", { name: "拒否", organization_id: organizationId }],
      [
        "sites",
        {
          client_id: client.id,
          name: "拒否",
          organization_id: organizationId,
          url: "https://denied.example.test",
        },
      ],
      [
        "site_services",
        { organization_id: organizationId, site_id: site.id, type: "ssl" },
      ],
      [
        "maintenance_contracts",
        {
          client_id: client.id,
          monthly_price_jpy: 0,
          name: "拒否",
          organization_id: organizationId,
          start_date: "2026-01-01",
          status: "active",
        },
      ],
      [
        "maintenance_tasks",
        { organization_id: organizationId, site_id: site.id, title: "拒否" },
      ],
      [
        "work_logs",
        {
          organization_id: organizationId,
          site_id: site.id,
          title: "拒否",
          worked_minutes: 1,
          worked_on: "2026-10-23",
        },
      ],
    ];

    for (const [table, values] of deniedInserts) {
      const result = await directUserClient.from(table).insert(values);
      expect(result.error, `${table} gated INSERT`).not.toBeNull();
    }

    await page.getByLabel("利用規約に同意します").check();
    await page.getByLabel("プライバシーポリシーに同意します").check();
    await page.getByRole("button", { name: "同意して次へ" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    for (const [table, id] of ownRows) {
      const result = await directUserClient
        .from(table)
        .select("id")
        .eq("id", id);
      expect(result.error, `${table} restored SELECT`).toBeNull();
      expect(result.data, `${table} restored SELECT`).toHaveLength(1);
    }

    for (const [table, id] of otherRows) {
      const result = await directUserClient
        .from(table)
        .select("id")
        .eq("id", id);
      expect(result.error, `${table} cross-tenant SELECT`).toBeNull();
      expect(result.data, `${table} cross-tenant SELECT`).toEqual([]);
    }

    const restoredRows = [
      await insertOne(directUserClient, "clients", {
        name: "復旧確認顧客",
        organization_id: organizationId,
      }),
      await insertOne(directUserClient, "sites", {
        client_id: client.id,
        name: "復旧確認サイト",
        organization_id: organizationId,
        url: "https://restored.example.test",
      }),
      await insertOne(directUserClient, "site_services", {
        organization_id: organizationId,
        site_id: site.id,
        type: "ssl",
      }),
      await insertOne(directUserClient, "maintenance_contracts", {
        client_id: client.id,
        monthly_price_jpy: 0,
        name: "復旧確認契約",
        organization_id: organizationId,
        start_date: "2026-01-01",
        status: "active",
      }),
      await insertOne(directUserClient, "maintenance_tasks", {
        organization_id: organizationId,
        site_id: site.id,
        title: "復旧確認タスク",
      }),
      await insertOne(directUserClient, "work_logs", {
        organization_id: organizationId,
        site_id: site.id,
        title: "復旧確認作業",
        worked_minutes: 1,
        worked_on: "2026-10-23",
      }),
    ];
    const businessTables = [
      "clients",
      "sites",
      "site_services",
      "maintenance_contracts",
      "maintenance_tasks",
      "work_logs",
    ] as const;

    for (const [index, table] of businessTables.entries()) {
      const id = restoredRows[index]?.id;
      const updateResult = await directUserClient
        .from(table)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id");
      expect(updateResult.error, `${table} restored UPDATE`).toBeNull();
      expect(updateResult.data, `${table} restored UPDATE`).toHaveLength(1);

      const deleteResult = await directUserClient
        .from(table)
        .delete()
        .eq("id", id)
        .select("id");
      expect(deleteResult.error, `${table} restored DELETE`).toBeNull();
      expect(deleteResult.data, `${table} restored DELETE`).toHaveLength(1);
    }

    const databaseContainer = requiredEnvironment("TEST_SUPABASE_DB_CONTAINER");
    execFileSync("docker", ["stop", "--time", "2", databaseContainer], {
      stdio: "pipe",
    });

    try {
      const databaseFailureResponse = await page.request.post(
        "/api/v1/onboarding",
        {
          data: { name: "DB障害時に作成されない組織" },
          headers: { origin: APP_URL },
          timeout: 15_000,
        },
      );
      expect(databaseFailureResponse.ok()).toBe(false);
      const databaseFailureBody = await databaseFailureResponse.text();
      expect(databaseFailureBody).not.toMatch(
        /postgres|connection refused|econnrefused|127\.0\.0\.1|stack/iu,
      );
    } finally {
      execFileSync("docker", ["start", databaseContainer], {
        stdio: "pipe",
      });
    }

    await expect
      .poll(
        async () => {
          const { error } = await admin
            .from("legal_document_versions")
            .select("id", { count: "exact", head: true });
          return error === null;
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    await expect(
      page.getByRole("button", { name: "ログアウト" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "ログアウト" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(
      (
        await page.request.post("/api/v1/onboarding", {
          data: { name: "ログアウト後の保護API" },
          headers: { origin: APP_URL },
        })
      ).status(),
    ).toBe(401);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  });
});
