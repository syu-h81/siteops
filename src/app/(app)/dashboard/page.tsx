import { LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageTitle, SectionTitle } from "@/components/ui/typography";

export const metadata: Metadata = { title: "ダッシュボード" };

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <PageTitle>ダッシュボード</PageTitle>
        <p className="text-muted-foreground">SiteOpsへようこそ。</p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <LayoutDashboard aria-hidden="true" className="text-primary size-8" />
          <SectionTitle>管理機能を準備しています</SectionTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="info">
            今後、顧客・Webサイト・契約・タスクなどをこの画面から管理できるようになります。
          </Alert>
        </CardContent>
      </Card>
    </main>
  );
}
