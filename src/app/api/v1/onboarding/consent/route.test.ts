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

const documents = [
  {
    content: "terms",
    content_hash: "a".repeat(64),
    content_path: "docs/legal/terms_v1.0.md",
    document_type: "terms" as const,
    id: "terms-1",
    version: "1.0",
  },
  {
    content: "privacy",
    content_hash: "b".repeat(64),
    content_path: "docs/legal/privacy_v1.0.md",
    document_type: "privacy" as const,
    id: "privacy-1",
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
  rpcError?: { message: string } | null;
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
  acceptPrivacy: true,
  acceptTerms: true,
  privacyVersion: "1.0",
  termsVersion: "1.0",
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

  it("チェック未完了の送信を拒否する", async () => {
    const response = await POST(
      request({ ...validInput, acceptPrivacy: false }),
    );

    expect(response.status).toBe(400);
    expect(mocks.getUsableCurrentLegalDocuments).not.toHaveBeenCalled();
  });

  it("正式文書がない場合は同意できない", async () => {
    mocks.getUsableCurrentLegalDocuments.mockResolvedValue([]);

    const response = await POST(request(validInput));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("legal_unavailable");
  });

  it("表示後に文書バージョンが変わった場合は再確認を求める", async () => {
    const response = await POST(
      request({ ...validInput, termsVersion: "0.9" }),
    );

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("legal_documents_changed");
  });

  it("既存RPCで同意し、状態を再確認する", async () => {
    const { rpc } = createSupabaseClient();
    mocks.getOnboardingStatus
      .mockResolvedValueOnce("consent_required")
      .mockResolvedValueOnce("organization_required");

    const response = await POST(request(validInput));

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("accept_current_legal_documents");
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

  it("DBエラーの内部情報をレスポンスへ含めない", async () => {
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
