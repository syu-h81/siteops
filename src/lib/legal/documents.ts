import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  hasMatchingContentHash,
  isLegalDocumentType,
  type LegalDocumentType,
} from "@/lib/legal/document-policy";
import type { Database } from "@/types/database.types";

const MAX_CONTENT_BYTES = 1024 * 1024;
const SHA_256_PATTERN = /^[0-9a-f]{64}$/;

export type LegalDocument = {
  content_hash: string;
  content_markdown: string;
  document_type: LegalDocumentType;
  effective_at: string;
  id: string;
  published_at: string;
  version: string;
};

export type LegalDocumentMetadata = Omit<LegalDocument, "content_markdown">;

export class LegalDocumentStateError extends Error {
  constructor() {
    super("法務文書の状態を確認できませんでした。");
    this.name = "LegalDocumentStateError";
  }
}

function hasCanonicalMarkdown(content: string) {
  return (
    content.trim().length > 0 &&
    Buffer.byteLength(content, "utf8") <= MAX_CONTENT_BYTES &&
    !content.includes("\r") &&
    content.endsWith("\n") &&
    !content.endsWith("\n\n")
  );
}

export async function getUsableCurrentLegalDocuments(
  supabase: SupabaseClient<Database>,
  currentTime = new Date(),
): Promise<LegalDocument[]> {
  const currentTimestamp = currentTime.toISOString();
  const { data, error } = await supabase
    .from("legal_document_versions")
    .select(
      "id, document_type, version, content_markdown, content_hash, published_at, effective_at",
    )
    .eq("publication_status", "published")
    .eq("is_current", true)
    .in("document_type", ["terms", "privacy"])
    .lte("published_at", currentTimestamp)
    .lte("effective_at", currentTimestamp);

  if (error) {
    throw new LegalDocumentStateError();
  }

  return data.flatMap((document) => {
    if (
      !isLegalDocumentType(document.document_type) ||
      typeof document.content_markdown !== "string" ||
      !hasCanonicalMarkdown(document.content_markdown) ||
      !SHA_256_PATTERN.test(document.content_hash) ||
      !hasMatchingContentHash(document.content_markdown, document.content_hash)
    ) {
      return [];
    }

    return [
      {
        ...document,
        content_markdown: document.content_markdown,
        document_type: document.document_type,
      },
    ];
  });
}

export function findLegalDocument(
  documents: readonly LegalDocument[],
  documentType: LegalDocumentType,
): LegalDocument | null {
  return (
    documents.find((document) => document.document_type === documentType) ??
    null
  );
}
