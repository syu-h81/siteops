import { FileClock, FileText } from "lucide-react";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { PageTitle } from "@/components/ui/typography";
import { LegalDocumentContent } from "@/features/legal/components/legal-document-content";
import {
  findLegalDocument,
  getUsableCurrentLegalDocuments,
} from "@/lib/legal/documents";
import {
  legalDocumentLabels,
  type LegalDocumentType,
} from "@/lib/legal/document-policy";
import { createClient } from "@/lib/supabase/server";

type LegalDocumentPageProps = {
  documentType: LegalDocumentType;
};

export async function LegalDocumentPage({
  documentType,
}: LegalDocumentPageProps) {
  const label = legalDocumentLabels[documentType];
  const documents = await getUsableCurrentLegalDocuments(await createClient());
  const document = findLegalDocument(documents, documentType);

  return (
    <main className="min-h-svh px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Link
          className="text-primary inline-block text-sm underline-offset-4 hover:underline"
          href="/onboarding"
        >
          SiteOpsへ戻る
        </Link>

        <Card>
          <CardHeader>
            {document ? (
              <FileText aria-hidden="true" className="text-info size-8" />
            ) : (
              <FileClock aria-hidden="true" className="text-warning size-8" />
            )}
            <PageTitle>{label}</PageTitle>
            {document ? (
              <CardDescription>
                現行バージョン：{document.version}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            {document ? (
              <LegalDocumentContent content={document.content_markdown} />
            ) : (
              <Alert variant="warning">
                正式文書を準備中です。公開までしばらくお待ちください。
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
