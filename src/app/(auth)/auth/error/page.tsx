import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/features/auth/components/auth-shell";

export const metadata: Metadata = { title: "認証エラー" };

export default function AuthErrorPage() {
  return (
    <AuthShell
      title="認証リンクを確認できませんでした"
      description="リンクが不正か、有効期限が切れている可能性があります。"
      footer={
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className="text-primary font-medium hover:underline"
          >
            新規登録へ戻る
          </Link>
          <Link
            href="/forgot-password"
            className="text-primary font-medium hover:underline"
          >
            再設定メールを送る
          </Link>
        </div>
      }
    >
      <Alert variant="destructive">
        メール内の最新リンクを使用してください。解決しない場合は、確認メールまたは再設定メールをもう一度送信してください。
      </Alert>
    </AuthShell>
  );
}
