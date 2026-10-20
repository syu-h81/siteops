import { describe, expect, it } from "vitest";

import { getAuthErrorMessage } from "@/features/auth/errors";

describe("認証エラーメッセージ", () => {
  it("認証情報不一致を日本語へ変換する", () => {
    expect(getAuthErrorMessage({ code: "invalid_credentials" })).toBe(
      "メールアドレスまたはパスワードが正しくありません。",
    );
  });

  it("未確認メールの案内を返す", () => {
    expect(getAuthErrorMessage({ code: "email_not_confirmed" })).toContain(
      "メールアドレスの確認",
    );
  });

  it("未知のサーバーメッセージをそのまま表示しない", () => {
    expect(
      getAuthErrorMessage({
        code: "unknown_error",
        message: "internal auth details",
      }),
    ).not.toContain("internal auth details");
  });
});
