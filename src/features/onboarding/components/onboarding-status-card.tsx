import { Building2, FileClock, FileText } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { PageTitle, SectionTitle } from "@/components/ui/typography";
import { LogoutButton } from "@/features/auth/components/logout-button";
import type { OnboardingStatus } from "@/lib/onboarding/status";

type VisibleOnboardingStatus = Exclude<
  OnboardingStatus,
  "completed" | "unauthenticated"
>;

type OnboardingStatusCardProps = {
  status: VisibleOnboardingStatus;
};

function StatusContent({ status }: OnboardingStatusCardProps) {
  if (status === "legal_unavailable") {
    return (
      <>
        <FileClock aria-hidden="true" className="text-warning size-8" />
        <div className="space-y-2">
          <SectionTitle>正式な法務文書を準備しています</SectionTitle>
          <p className="text-muted-foreground leading-6">
            現在、利用規約とプライバシーポリシーの正式版を準備しています。
          </p>
          <p className="text-muted-foreground leading-6">
            準備が完了するまで、初期設定はご利用いただけません。
          </p>
        </div>
        <Alert variant="warning">
          草案への同意や組織の作成は行われません。
        </Alert>
      </>
    );
  }

  if (status === "consent_required") {
    return (
      <>
        <FileText aria-hidden="true" className="text-info size-8" />
        <div className="space-y-2">
          <SectionTitle>法務文書への同意が必要です</SectionTitle>
          <p className="text-muted-foreground leading-6">
            利用規約とプライバシーポリシーへの同意が必要です。
          </p>
        </div>
        <Alert variant="info">
          同意手続は現在準備中です。この画面ではまだ同意を記録しません。
        </Alert>
      </>
    );
  }

  return (
    <>
      <Building2 aria-hidden="true" className="text-info size-8" />
      <div className="space-y-2">
        <SectionTitle>組織の初期設定が必要です</SectionTitle>
        <p className="text-muted-foreground leading-6">
          SiteOpsを利用する組織の初期設定が必要です。
        </p>
      </div>
      <Alert variant="info">
        組織作成機能は現在準備中です。この画面ではまだ組織を作成しません。
      </Alert>
    </>
  );
}

export function OnboardingStatusCard({ status }: OnboardingStatusCardProps) {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-lg">
        <p className="text-primary mb-6 text-center text-sm font-bold tracking-[0.2em]">
          SITEOPS
        </p>
        <Card>
          <CardHeader>
            <PageTitle>SiteOpsの初期設定</PageTitle>
            <CardDescription>
              ご利用開始に向けて準備を進めています。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <StatusContent status={status} />
          </CardContent>
          <CardFooter className="border-t pt-6">
            <LogoutButton />
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
