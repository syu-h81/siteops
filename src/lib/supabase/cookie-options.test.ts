import { afterEach, describe, expect, it, vi } from "vitest";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

describe("Supabase Cookie属性", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("本番ではSecure、全環境でSameSite=LaxとPath=/を使用する", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(getSupabaseCookieOptions()).toEqual({
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("ローカルHTTP開発ではSecureを無効にする", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(getSupabaseCookieOptions().secure).toBe(false);
  });
});
