import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { cn } from "@/lib/utils";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="bg-card w-full max-w-2xl rounded-2xl border p-8 shadow-sm sm:p-12">
        <p className="text-primary text-sm font-semibold tracking-widest">
          SITEOPS
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Webサイト保守業務を、ひとつに。
        </h1>
        <p className="text-muted-foreground mt-5 max-w-xl leading-7">
          SiteOpsは、顧客・サイト・契約・更新期限・作業履歴を組織単位で管理するためのサービスです。
        </p>
        {user ? (
          <div className="mt-8 space-y-5 border-t pt-6">
            <div>
              <p className="font-semibold">認証が完了しています</p>
              <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
            </div>
            <Alert>
              組織の初期設定と利用規約・プライバシーポリシーへの正式な同意はPhase
              1-Cで実装します。完了するまで業務機能は利用できません。
            </Alert>
            <LogoutButton />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row">
            <Link href="/login" className={cn(buttonVariants(), "h-10 px-4")}>
              ログイン
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 px-4",
              )}
            >
              新規登録
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
