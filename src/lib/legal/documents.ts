import "server-only";

import { readFile } from "node:fs/promises";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getLegalDocumentFilePath,
  hasMatchingContentHash,
  isFormalLegalDocument,
  isLegalDocumentType,
  type LegalDocumentMetadata,
  type LegalDocumentType,
} from "@/lib/legal/document-policy";
import type { Database } from "@/types/database.types";

export type LegalDocument = LegalDocumentMetadata & {
  content: string;
};

export class LegalDocumentStateError extends Error {
  constructor() {
    super("法務文書の状態を確認できませんでした。");
    this.name = "LegalDocumentStateError";
  }
}

export async function getCurrentLegalDocuments(
  supabase: SupabaseClient<Database>,
  currentTime = new Date(),
): Promise<LegalDocumentMetadata[]> {
  const { data, error } = await supabase
    .from("legal_document_versions")
    .select("id, document_type, version, content_path, content_hash")
    .eq("is_current", true)
    .in("document_type", ["terms", "privacy"])
    .lte("published_at", currentTime.toISOString())
    .lte("effective_at", currentTime.toISOString());

  if (error) {
    throw new LegalDocumentStateError();
  }

  return data.flatMap((document) => {
    if (!isLegalDocumentType(document.document_type)) {
      return [];
    }

    const metadata: LegalDocumentMetadata = {
      ...document,
      document_type: document.document_type,
    };

    return isFormalLegalDocument(metadata) ? [metadata] : [];
  });
}

export async function loadLegalDocument(
  document: LegalDocumentMetadata,
): Promise<LegalDocument | null> {
  const filePath = getLegalDocumentFilePath(document.content_path);

  if (!filePath || !isFormalLegalDocument(document)) {
    return null;
  }

  try {
    const content = await readFile(filePath, "utf8");

    if (!hasMatchingContentHash(content, document.content_hash)) {
      return null;
    }

    return { ...document, content };
  } catch {
    return null;
  }
}

export async function getUsableCurrentLegalDocuments(
  supabase: SupabaseClient<Database>,
  currentTime = new Date(),
): Promise<LegalDocument[]> {
  const documents = await getCurrentLegalDocuments(supabase, currentTime);
  const loadedDocuments = await Promise.all(documents.map(loadLegalDocument));

  return loadedDocuments.filter(
    (document): document is LegalDocument => document !== null,
  );
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
