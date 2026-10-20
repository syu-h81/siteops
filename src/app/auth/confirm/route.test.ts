import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET } from "@/app/auth/confirm/route";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/auth/password-recovery";

describe("認証確認Route Handler", () => {
  it("不正なリンクをキャッシュせず安全なエラー画面へ送る", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/auth/confirm?type=email"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/error",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("回復トークンを短命なHttpOnly Cookieへ退避する", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/confirm?token_hash=test-token&type=recovery&next=https://evil.example",
      ),
    );
    const recoveryCookie = response.cookies.get(PASSWORD_RECOVERY_COOKIE);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/reset-password",
    );
    expect(recoveryCookie?.value).toBe("test-token");
    expect(recoveryCookie?.httpOnly).toBe(true);
    expect(recoveryCookie?.sameSite).toBe("lax");
    expect(recoveryCookie?.path).toBe("/reset-password");
  });
});
