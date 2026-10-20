import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  const cookieValues = new Map<string, string>();

  return {
    consumed: false,
    cookieValues,
    currentUserId: null as string | null,
    expired: false,
    recoveryEstablished: false,
    recoveryUserId: "user-a",
    signOut: vi.fn(),
    updateUser: vi.fn(),
    verifyOtp: vi.fn(),
  };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = state.cookieValues.get(name);
      return value ? { name, value } : undefined;
    },
    set: (name: string, value: string, options: { maxAge?: number }) => {
      if (options.maxAge === 0) {
        state.cookieValues.delete(name);
        return;
      }

      state.cookieValues.set(name, value);
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getClaims: async () => ({
        data: state.recoveryEstablished
          ? { claims: { session_id: "recovery-session" } }
          : null,
        error: state.recoveryEstablished ? null : new Error("no session"),
      }),
      getUser: async (accessToken?: string) => {
        const userId =
          accessToken || state.recoveryEstablished
            ? state.recoveryUserId
            : state.currentUserId;

        return {
          data: { user: userId ? { id: userId } : null },
          error: null,
        };
      },
      signOut: state.signOut,
      updateUser: state.updateUser,
      verifyOtp: state.verifyOtp,
    },
  }),
}));

import { resetPassword } from "@/features/auth/actions";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/auth/password-recovery";

const validInput = {
  password: "new-password-1",
  passwordConfirmation: "new-password-1",
};

describe("パスワード回復Server Action", () => {
  beforeEach(() => {
    state.consumed = false;
    state.cookieValues.clear();
    state.currentUserId = null;
    state.expired = false;
    state.recoveryEstablished = false;
    state.recoveryUserId = "user-a";
    state.signOut.mockReset().mockImplementation(async () => {
      state.recoveryEstablished = false;
      return { error: null };
    });
    state.updateUser.mockReset().mockResolvedValue({ error: null });
    state.verifyOtp.mockReset().mockImplementation(async ({ token_hash }) => {
      if (token_hash !== "valid-token" || state.consumed || state.expired) {
        return {
          data: { session: null, user: null },
          error: new Error("invalid"),
        };
      }

      state.consumed = true;
      state.recoveryEstablished = true;
      return {
        data: {
          session: { access_token: "recovery-access-token" },
          user: { id: state.recoveryUserId },
        },
        error: null,
      };
    });
  });

  it("通常ログインセッションだけでは変更できない", async () => {
    state.currentUserId = "user-a";

    await expect(resetPassword(validInput)).resolves.toMatchObject({
      error: expect.stringContaining("再設定リンク"),
    });
    expect(state.verifyOtp).not.toHaveBeenCalled();
    expect(state.updateUser).not.toHaveBeenCalled();
  });

  it.each([
    ["改ざん", "tampered-token", false],
    ["期限切れ", "valid-token", true],
  ])("%sの回復証明を拒否する", async (_label, token, expired) => {
    state.expired = expired;
    state.cookieValues.set(PASSWORD_RECOVERY_COOKIE, token);

    await expect(resetPassword(validInput)).resolves.toMatchObject({
      error: expect.stringContaining("無効か、有効期限"),
    });
    expect(state.updateUser).not.toHaveBeenCalled();
  });

  it("別ユーザーの通常セッションでは回復証明を利用できない", async () => {
    state.currentUserId = "user-b";
    state.cookieValues.set(PASSWORD_RECOVERY_COOKIE, "valid-token");

    await expect(resetPassword(validInput)).resolves.toMatchObject({
      error: expect.stringContaining("再設定リンク"),
    });
    expect(state.updateUser).not.toHaveBeenCalled();
    expect(state.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("正規の証明を一度だけ使用し、成功後に全セッションを破棄する", async () => {
    state.cookieValues.set(PASSWORD_RECOVERY_COOKIE, "valid-token");

    await expect(resetPassword(validInput)).rejects.toThrow(
      "NEXT_REDIRECT:/login?password_reset=1",
    );
    expect(state.updateUser).toHaveBeenCalledWith({
      password: validInput.password,
    });
    expect(state.signOut).toHaveBeenCalledWith({ scope: "global" });

    state.cookieValues.set(PASSWORD_RECOVERY_COOKIE, "valid-token");
    await expect(resetPassword(validInput)).resolves.toMatchObject({
      error: expect.stringContaining("無効か、有効期限"),
    });
    expect(state.updateUser).toHaveBeenCalledTimes(1);
  });
});
