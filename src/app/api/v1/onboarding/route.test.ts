import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOnboardingStatus: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/lib/onboarding/get-onboarding-status", () => ({
  getOnboardingStatus: mocks.getOnboardingStatus,
}));

import { POST } from "@/app/api/v1/onboarding/route";

function request(
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/onboarding", {
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
  existingOrganization = null,
  insertError = null,
  organizationError = null,
  user = { id: "user-1" },
}: {
  existingOrganization?: { id: string } | null;
  insertError?: { code: string; message: string } | null;
  organizationError?: { message: string } | null;
  user?: { id: string } | null;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: existingOrganization,
    error: organizationError,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const insert = vi.fn().mockResolvedValue({ error: insertError });
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({ insert, select }),
  };

  mocks.createClient.mockResolvedValue(client);
  return { client, insert };
}

describe("POST /api/v1/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseClient();
  });

  it("未認証ユーザーへ401を返す", async () => {
    createSupabaseClient({ user: null });

    const response = await POST(request({ name: "BuildLab" }));

    expect(response.status).toBe(401);
    expect(mocks.getOnboardingStatus).not.toHaveBeenCalled();
  });

  it.each(["", "   ", "a".repeat(201)])(
    "不正な組織名へ400を返す",
    async (name) => {
      const response = await POST(request({ name }));

      expect(response.status).toBe(400);
    },
  );

  it("owner_user_idを含む入力を拒否する", async () => {
    const response = await POST(
      request({ name: "BuildLab", owner_user_id: "attacker" }),
    );

    expect(response.status).toBe(400);
  });

  it("未同意ユーザーへ409を返す", async () => {
    mocks.getOnboardingStatus.mockResolvedValue("consent_required");

    const response = await POST(request({ name: "BuildLab" }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("consent_required");
  });

  it("組織作成済みユーザーへ409を返す", async () => {
    mocks.getOnboardingStatus.mockResolvedValue("completed");

    const response = await POST(request({ name: "BuildLab" }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("organization_exists");
  });

  it("サーバーで取得したユーザーIDを使い組織を作成する", async () => {
    const { insert } = createSupabaseClient();
    mocks.getOnboardingStatus
      .mockResolvedValueOnce("organization_required")
      .mockResolvedValueOnce("completed");

    const response = await POST(request({ name: "  BuildLab  " }));

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({
      name: "BuildLab",
      owner_user_id: "user-1",
    });
    expect(await response.json()).toEqual({
      data: { redirectTo: "/dashboard" },
    });
  });

  it("同時送信のUNIQUE違反へ409を返す", async () => {
    createSupabaseClient({
      insertError: { code: "23505", message: "duplicate secret" },
    });
    mocks.getOnboardingStatus.mockResolvedValue("organization_required");

    const response = await POST(request({ name: "BuildLab" }));
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(409);
    expect(body).not.toContain("duplicate secret");
  });

  it("DBエラーの内部情報をレスポンスへ含めない", async () => {
    createSupabaseClient({
      organizationError: { message: "secret database detail" },
    });
    mocks.getOnboardingStatus.mockResolvedValue("organization_required");

    const response = await POST(request({ name: "BuildLab" }));
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(body).not.toContain("secret database detail");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("異なるOriginからの送信を拒否する", async () => {
    const response = await POST(
      request({ name: "BuildLab" }, { origin: "https://attacker.example" }),
    );

    expect(response.status).toBe(403);
  });
});
