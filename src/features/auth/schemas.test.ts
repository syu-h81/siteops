import { describe, expect, it } from "vitest";

import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/features/auth/schemas";

describe("認証フォームのバリデーション", () => {
  it("正しいログイン入力を受け付ける", () => {
    expect(
      loginSchema.safeParse({
        email: "owner@example.com",
        password: "password",
      }).success,
    ).toBe(true);
  });

  it("不正なメールアドレスを拒否する", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "invalid-email" }).success,
    ).toBe(false);
  });

  it("8文字未満の新規登録パスワードを拒否する", () => {
    expect(
      signupSchema.safeParse({
        email: "owner@example.com",
        password: "short",
        passwordConfirmation: "short",
      }).success,
    ).toBe(false);
  });

  it("一致しない新規登録パスワードを確認欄のエラーにする", () => {
    const result = signupSchema.safeParse({
      email: "owner@example.com",
      password: "password-a",
      passwordConfirmation: "password-b",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["passwordConfirmation"]);
  });

  it("一致しない再設定パスワードを拒否する", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "password-a",
        passwordConfirmation: "password-b",
      }).success,
    ).toBe(false);
  });
});
