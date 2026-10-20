import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { SignupForm } from "@/features/auth/components/signup-form";
import { redirectAuthenticatedUser } from "@/lib/auth/get-current-user";

export const metadata: Metadata = { title: "新規登録" };

export default async function SignupPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthShell
      title="新規登録"
      description="メール確認後にSiteOpsへログインできます。"
      footer={
        <p>
          既にアカウントをお持ちの方は{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary-hover focus-visible:ring-ring rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            ログイン
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
