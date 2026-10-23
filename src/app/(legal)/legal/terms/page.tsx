import type { Metadata } from "next";

import { LegalDocumentPage } from "@/features/legal/components/legal-document-page";

export const metadata: Metadata = { title: "利用規約" };
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return <LegalDocumentPage documentType="terms" />;
}
