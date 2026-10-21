import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { cn } from "@/lib/utils";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/onboarding");
  }

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
        <div className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row">
          <Link href="/login" className={cn(buttonVariants(), "h-10 px-4")}>
            ログイン
          </Link>
          <Link
            href="/signup"
            className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
          >
            新規登録
          </Link>
        </div>
      </main>
    </div>
  );
}
