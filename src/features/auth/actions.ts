"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resetPasswordSchema } from "@/features/auth/schemas";
import {
  getPasswordRecoveryCookieOptions,
  PASSWORD_RECOVERY_COOKIE,
} from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/server";

const INVALID_RECOVERY_MESSAGE =
  "再設定リンクが無効か、有効期限が切れています。再設定メールをもう一度送信してください。";

type ResetPasswordResult = { error: string };

async function clearCurrentAuthSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  await supabase.auth.signOut({ scope: "local" });
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function resetPassword(
  input: unknown,
): Promise<ResetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "入力内容を確認して、もう一度お試しください。",
    };
  }

  const cookieStore = await cookies();
  const tokenHash = cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value;

  if (!tokenHash) {
    return { error: INVALID_RECOVERY_MESSAGE };
  }

  const supabase = await createClient();
  const {
    data: { user: userBeforeRecovery },
  } = await supabase.auth.getUser();
  const { data: recoveryData, error: recoveryError } =
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });

  if (recoveryError || !recoveryData.session || !recoveryData.user) {
    return { error: INVALID_RECOVERY_MESSAGE };
  }

  const accessToken = recoveryData.session.access_token;
  const [issuedClaimsResult, currentClaimsResult, verifiedUserResult] =
    await Promise.all([
      supabase.auth.getClaims(accessToken),
      supabase.auth.getClaims(),
      supabase.auth.getUser(accessToken),
    ]);
  const issuedSessionId = issuedClaimsResult.data?.claims.session_id;
  const currentSessionId = currentClaimsResult.data?.claims.session_id;
  const verifiedUser = verifiedUserResult.data.user;

  if (
    issuedClaimsResult.error ||
    currentClaimsResult.error ||
    verifiedUserResult.error ||
    !issuedSessionId ||
    issuedSessionId !== currentSessionId ||
    !verifiedUser ||
    verifiedUser.id !== recoveryData.user.id ||
    (userBeforeRecovery && userBeforeRecovery.id !== recoveryData.user.id)
  ) {
    await clearCurrentAuthSession(supabase);
    return { error: INVALID_RECOVERY_MESSAGE };
  }

  const {
    data: { user: currentUser },
    error: currentUserError,
  } = await supabase.auth.getUser();

  if (currentUserError || currentUser?.id !== recoveryData.user.id) {
    await clearCurrentAuthSession(supabase);
    return { error: INVALID_RECOVERY_MESSAGE };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (updateError) {
    await clearCurrentAuthSession(supabase);
    return { error: "パスワードを更新できませんでした。" };
  }

  cookieStore.set(PASSWORD_RECOVERY_COOKIE, "", {
    ...getPasswordRecoveryCookieOptions(),
    maxAge: 0,
  });

  const { error: signOutError } = await supabase.auth.signOut({
    scope: "global",
  });

  if (signOutError) {
    await clearCurrentAuthSession(supabase);
  }

  redirect("/login?password_reset=1");
}
