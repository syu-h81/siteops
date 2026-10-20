import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { redirectAuthenticatedUser } from "@/lib/auth/get-current-user";
import { getSafeRedirectPath } from "@/lib/auth/redirects";

export const metadata: Metadata = { title: "ログイン" };

type LoginPageProps = {
  searchParams: Promise<{
    confirmed?: string;
    next?: string;
    password_reset?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await redirectAuthenticatedUser();
  const params = await searchParams;
  const notice = params.password_reset
    ? "パスワードを更新しました。新しいパスワードでログインしてください。"
    : params.confirmed
      ? "メールアドレスを確認しました。ログインしてください。"
      : undefined;

  return (
    <AuthShell
      title="ログイン"
      description="登録したメールアドレスとパスワードを入力してください。"
      footer={
        <p>
          アカウントをお持ちでない方は{" "}
          <Link
            href="/signup"
            className="text-primary hover:text-primary-hover focus-visible:ring-ring rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            新規登録
          </Link>
        </p>
      }
    >
      <LoginForm nextPath={getSafeRedirectPath(params.next)} notice={notice} />
    </AuthShell>
  );
}
