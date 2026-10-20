import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { redirectAuthenticatedUser } from "@/lib/auth/get-current-user";

export const metadata: Metadata = { title: "パスワード再設定" };

export default async function ForgotPasswordPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthShell
      title="パスワードを再設定"
      description="登録したメールアドレスへ再設定用のリンクを送信します。"
      footer={
        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          ログインへ戻る
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
