import type { Metadata } from "next";

import { LegalDocumentPage } from "@/features/legal/components/legal-document-page";

export const metadata: Metadata = { title: "プライバシーポリシー" };
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return <LegalDocumentPage documentType="privacy" />;
}
