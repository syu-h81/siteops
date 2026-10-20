import { describe, expect, it } from "vitest";

import { getSafeRedirectPath } from "@/lib/auth/redirects";

describe("認証後リダイレクト", () => {
  it("アプリ内の相対パスを許可する", () => {
    expect(getSafeRedirectPath("/dashboard?tab=tasks")).toBe(
      "/dashboard?tab=tasks",
    );
  });

  it("外部URLを拒否する", () => {
    expect(getSafeRedirectPath("https://evil.example/steal")).toBe("/");
    expect(getSafeRedirectPath("//evil.example/steal")).toBe("/");
    expect(getSafeRedirectPath("/\\evil.example/steal")).toBe("/");
    expect(getSafeRedirectPath("javascript:alert(1)")).toBe("/");
  });

  it("不正値には指定されたフォールバックを使う", () => {
    expect(getSafeRedirectPath(null, "/login")).toBe("/login");
  });
});
