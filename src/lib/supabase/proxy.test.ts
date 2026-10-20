import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticated: false,
  setAll: true,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        setAll: (
          cookies: Array<{
            name: string;
            options: { path: string; sameSite: "lax" };
            value: string;
          }>,
          headers: Record<string, string>,
        ) => void;
      };
    },
  ) => ({
    auth: {
      getClaims: async () => {
        if (mocks.setAll) {
          options.cookies.setAll(
            [
              {
                name: "sb-test-auth-token",
                options: { path: "/", sameSite: "lax" },
                value: "refreshed-session",
              },
            ],
            {
              "Cache-Control":
                "private, no-cache, no-store, must-revalidate, max-age=0",
              Expires: "0",
              Pragma: "no-cache",
            },
          );
        }

        return mocks.authenticated
          ? { data: { claims: { sub: "user-a" } }, error: null }
          : { data: { claims: {} }, error: null };
      },
    },
  }),
}));

import { updateSession } from "@/lib/supabase/proxy";

describe("Supabase Proxy", () => {
  beforeEach(() => {
    mocks.authenticated = false;
    mocks.setAll = true;
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  });

  it("Cookie更新時のキャッシュ禁止ヘッダーを維持する", async () => {
    const response = await updateSession(
      new NextRequest("http://localhost:3000/"),
    );

    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "refreshed-session",
    );
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("保護ページへのリダイレクトでもCookieとヘッダーを維持する", async () => {
    const response = await updateSession(
      new NextRequest("http://localhost:3000/dashboard?view=all"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fdashboard%3Fview%3Dall",
    );
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "refreshed-session",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("getClaimsだけではゲストページからリダイレクトしない", async () => {
    mocks.authenticated = true;

    const response = await updateSession(
      new NextRequest("http://localhost:3000/login"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
