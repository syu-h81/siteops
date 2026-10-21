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
import { LegalConsentForm } from "@/features/onboarding/components/legal-consent-form";
import { OrganizationForm } from "@/features/onboarding/components/organization-form";
import type { LegalDocumentMetadata } from "@/lib/legal/document-policy";
import type { OnboardingStatus } from "@/lib/onboarding/status";

type VisibleOnboardingStatus = Exclude<
  OnboardingStatus,
  "completed" | "unauthenticated"
>;

type OnboardingStatusCardProps = {
  legalDocuments?: readonly LegalDocumentMetadata[];
  status: VisibleOnboardingStatus;
};

function StatusContent({
  legalDocuments = [],
  status,
}: OnboardingStatusCardProps) {
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
    const termsDocument = legalDocuments.find(
      (document) => document.document_type === "terms",
    );
    const privacyDocument = legalDocuments.find(
      (document) => document.document_type === "privacy",
    );

    if (!termsDocument || !privacyDocument) {
      return (
        <Alert variant="warning">
          法務文書の状態が変更されました。画面を再読み込みしてください。
        </Alert>
      );
    }

    return (
      <>
        <FileText aria-hidden="true" className="text-info size-8" />
        <div className="space-y-2">
          <SectionTitle>法務文書への同意が必要です</SectionTitle>
          <p className="text-muted-foreground leading-6">
            利用規約とプライバシーポリシーへの同意が必要です。
          </p>
        </div>
        <LegalConsentForm
          privacyDocument={privacyDocument}
          termsDocument={termsDocument}
        />
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
      <OrganizationForm />
    </>
  );
}

export function OnboardingStatusCard({
  legalDocuments,
  status,
}: OnboardingStatusCardProps) {
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
            <StatusContent legalDocuments={legalDocuments} status={status} />
          </CardContent>
          <CardFooter className="border-t pt-6">
            <LogoutButton />
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
