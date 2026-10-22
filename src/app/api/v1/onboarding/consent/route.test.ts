import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOnboardingStatus: vi.fn(),
  getUsableCurrentLegalDocuments: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/lib/onboarding/get-onboarding-status", () => ({
  getOnboardingStatus: mocks.getOnboardingStatus,
}));
vi.mock("@/lib/legal/documents", () => ({
  findLegalDocument: (
    documents: { document_type: string }[],
    documentType: string,
  ) =>
    documents.find((document) => document.document_type === documentType) ??
    null,
  getUsableCurrentLegalDocuments: mocks.getUsableCurrentLegalDocuments,
}));

import { POST } from "@/app/api/v1/onboarding/consent/route";

const termsDocumentId = "00000000-0000-4000-8000-000000000001";
const privacyDocumentId = "00000000-0000-4000-8000-000000000002";
const termsContentHash = "a".repeat(64);
const privacyContentHash = "b".repeat(64);
const documents = [
  {
    content_hash: termsContentHash,
    content_markdown: "# 利用規約\n",
    document_type: "terms" as const,
    effective_at: "2026-01-01T00:00:00.000Z",
    id: termsDocumentId,
    published_at: "2026-01-01T00:00:00.000Z",
    version: "1.0",
  },
  {
    content_hash: privacyContentHash,
    content_markdown: "# プライバシーポリシー\n",
    document_type: "privacy" as const,
    effective_at: "2026-01-01T00:00:00.000Z",
    id: privacyDocumentId,
    published_at: "2026-01-01T00:00:00.000Z",
    version: "1.0",
  },
];

function request(
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/onboarding/consent", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      ...headers,
    },
    method: "POST",
  });
}

function createSupabaseClient({
  rpcError = null,
  user = { id: "user-1" },
}: {
  rpcError?: { code?: string; message: string } | null;
  user?: { id: string } | null;
} = {}) {
  const rpc = vi.fn().mockResolvedValue({ error: rpcError });
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    rpc,
  };

  mocks.createClient.mockResolvedValue(client);
  return { client, rpc };
}

const validInput = {
  privacyAccepted: true,
  privacyContentHash,
  privacyDocumentId,
  termsAccepted: true,
  termsContentHash,
  termsDocumentId,
};

describe("POST /api/v1/onboarding/consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseClient();
    mocks.getUsableCurrentLegalDocuments.mockResolvedValue(documents);
  });

  it("未認証の同意処理を拒否する", async () => {
    createSupabaseClient({ user: null });

    const response = await POST(request(validInput));

    expect(response.status).toBe(401);
    expect(mocks.getUsableCurrentLegalDocuments).not.toHaveBeenCalled();
  });

  it("片方だけの同意と余計な項目を拒否する", async () => {
    const uncheckedResponse = await POST(
      request({ ...validInput, privacyAccepted: false }),
    );
    const extraFieldResponse = await POST(
      request({ ...validInput, userId: "attacker-controlled" }),
    );

    expect(uncheckedResponse.status).toBe(400);
    expect(extraFieldResponse.status).toBe(400);
    expect(mocks.getUsableCurrentLegalDocuments).not.toHaveBeenCalled();
  });

  it("正式文書がない場合は同意できない", async () => {
    mocks.getUsableCurrentLegalDocuments.mockResolvedValue([]);

    const response = await POST(request(validInput));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("legal_unavailable");
  });

  it.each([
    ["文書ID", { termsDocumentId: "00000000-0000-4000-8000-000000000099" }],
    ["本文ハッシュ", { privacyContentHash: "c".repeat(64) }],
  ])("表示後に%sが変わった場合は409を返す", async (_label, changed) => {
    const response = await POST(request({ ...validInput, ...changed }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("legal_documents_changed");
  });

  it("新RPCへ表示文書の4つの期待値を渡し、状態を再確認する", async () => {
    const { rpc } = createSupabaseClient();
    mocks.getOnboardingStatus
      .mockResolvedValueOnce("consent_required")
      .mockResolvedValueOnce("organization_required");

    const response = await POST(request(validInput));

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("accept_legal_documents", {
      p_privacy_content_hash: privacyContentHash,
      p_privacy_document_id: privacyDocumentId,
      p_terms_content_hash: termsContentHash,
      p_terms_document_id: termsDocumentId,
    });
    expect(rpc).not.toHaveBeenCalledWith("accept_current_legal_documents");
    expect(await response.json()).toEqual({
      data: { status: "organization_required" },
    });
  });

  it("同意済みの二重送信はRPCを再実行せず成功する", async () => {
    const { rpc } = createSupabaseClient();
    mocks.getOnboardingStatus.mockResolvedValue("organization_required");

    const response = await POST(request(validInput));

    expect(response.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("RPC内で文書が切り替わった場合は409を返す", async () => {
    createSupabaseClient({
      rpcError: { code: "P0001", message: "database detail" },
    });
    mocks.getOnboardingStatus.mockResolvedValue("consent_required");

    const response = await POST(request(validInput));
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(409);
    expect(body).toContain("legal_documents_changed");
    expect(body).not.toContain("database detail");
  });

  it("DB取得エラーを文書未登録に変換せず内部情報を隠す", async () => {
    mocks.getUsableCurrentLegalDocuments.mockRejectedValue(
      new Error("secret query detail"),
    );

    const response = await POST(request(validInput));
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(body).not.toContain("secret query detail");
  });

  it("RPCエラーの内部情報をレスポンスへ含めない", async () => {
    createSupabaseClient({ rpcError: { message: "secret database detail" } });
    mocks.getOnboardingStatus.mockResolvedValue("consent_required");

    const response = await POST(request(validInput));
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(body).not.toContain("secret database detail");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("異なるOriginからの送信を拒否する", async () => {
    const response = await POST(
      request(validInput, { origin: "https://attacker.example" }),
    );

    expect(response.status).toBe(403);
  });
});
