import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPasswordRecoveryCookieOptions,
  PASSWORD_RECOVERY_MAX_AGE_SECONDS,
  recoveryTokenHashSchema,
} from "@/lib/auth/password-recovery";

describe("パスワード回復証明", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("短い有効期限と安全なCookie属性を使用する", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(getPasswordRecoveryCookieOptions()).toMatchObject({
      httpOnly: true,
      maxAge: PASSWORD_RECOVERY_MAX_AGE_SECONDS,
      path: "/reset-password",
      sameSite: "lax",
      secure: true,
    });
    expect(PASSWORD_RECOVERY_MAX_AGE_SECONDS).toBe(600);
  });

  it("制御文字や過大なトークンを拒否する", () => {
    expect(recoveryTokenHashSchema.safeParse("valid-token").success).toBe(true);
    expect(recoveryTokenHashSchema.safeParse("invalid\ntoken").success).toBe(
      false,
    );
    expect(recoveryTokenHashSchema.safeParse("a".repeat(1025)).success).toBe(
      false,
    );
  });
});
