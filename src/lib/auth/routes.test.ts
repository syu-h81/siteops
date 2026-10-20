import { describe, expect, it } from "vitest";

import { isGuestOnlyRoute, isProtectedRoute } from "@/lib/auth/routes";

describe("認証ルートポリシー", () => {
  it.each([
    "/onboarding",
    "/dashboard",
    "/clients/123",
    "/sites",
    "/contracts",
    "/tasks",
    "/renewals",
    "/work-logs",
    "/settings",
  ])("%sを保護対象にする", (pathname) => {
    expect(isProtectedRoute(pathname)).toBe(true);
  });

  it.each(["/login", "/signup", "/forgot-password"])(
    "%sを未認証ユーザー向けページにする",
    (pathname) => {
      expect(isGuestOnlyRoute(pathname)).toBe(true);
    },
  );

  it("回復セッションが使うページとコールバックはゲスト専用にしない", () => {
    expect(isGuestOnlyRoute("/reset-password")).toBe(false);
    expect(isGuestOnlyRoute("/auth/confirm")).toBe(false);
    expect(isGuestOnlyRoute("/auth/callback")).toBe(false);
  });
});
