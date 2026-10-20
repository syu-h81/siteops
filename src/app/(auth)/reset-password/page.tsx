import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/auth/password-recovery";

export const metadata: Metadata = { title: "新しいパスワード" };

export default async function ResetPasswordPage() {
  const hasRecoveryProof = Boolean(
    (await cookies()).get(PASSWORD_RECOVERY_COOKIE)?.value,
  );

  return (
    <AuthShell
      title="新しいパスワードを設定"
      description="第三者が推測しにくいパスワードを設定してください。"
      footer={
        <Link
          href="/login"
          className="text-primary hover:text-primary-hover focus-visible:ring-ring rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          ログインへ戻る
        </Link>
      }
    >
      {hasRecoveryProof ? (
        <ResetPasswordForm />
      ) : (
        <Alert variant="destructive">
          再設定セッションを確認できません。リンクの有効期限が切れている可能性があります。パスワード再設定メールをもう一度送信してください。
        </Alert>
      )}
    </AuthShell>
  );
}
