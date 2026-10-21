import { describe, expect, it } from "vitest";

import {
  getOnboardingPageRedirect,
  getProtectedAppRedirect,
} from "@/lib/onboarding/navigation";

describe("オンボーディング画面の遷移", () => {
  it("未認証ユーザーをログインへ送る", () => {
    expect(getOnboardingPageRedirect("unauthenticated")).toBe("/login");
  });

  it("完了ユーザーをダッシュボードへ送る", () => {
    expect(getOnboardingPageRedirect("completed")).toBe("/dashboard");
  });

  it.each([
    "legal_unavailable",
    "consent_required",
    "organization_required",
  ] as const)("%sはオンボーディング画面に留める", (status) => {
    expect(getOnboardingPageRedirect(status)).toBeNull();
  });
});

describe("業務画面の遷移", () => {
  it("未認証ユーザーをログインへ送る", () => {
    expect(getProtectedAppRedirect("unauthenticated")).toBe("/login");
  });

  it.each([
    "legal_unavailable",
    "consent_required",
    "organization_required",
  ] as const)("%sをオンボーディングへ戻す", (status) => {
    expect(getProtectedAppRedirect(status)).toBe("/onboarding");
  });

  it("完了ユーザーにはダッシュボードを表示する", () => {
    expect(getProtectedAppRedirect("completed")).toBeNull();
  });
});
