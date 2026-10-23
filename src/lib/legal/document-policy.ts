import { createHash } from "node:crypto";
import path from "node:path";

export type LegalDocumentType = "privacy" | "terms";

export type LegalDocumentMetadata = {
  content_hash: string;
  content_path: string;
  document_type: LegalDocumentType;
  id: string;
  version: string;
};

const HASH_PATTERN = /^[0-9a-f]{64}$/;
const DRAFT_PATTERN = /draft/i;

export const legalDocumentLabels: Record<LegalDocumentType, string> = {
  privacy: "プライバシーポリシー",
  terms: "利用規約",
};

export function isLegalDocumentType(value: string): value is LegalDocumentType {
  return value === "privacy" || value === "terms";
}

export function isFormalLegalDocument(
  document: LegalDocumentMetadata,
): boolean {
  return (
    !DRAFT_PATTERN.test(document.version) &&
    !DRAFT_PATTERN.test(document.content_path) &&
    HASH_PATTERN.test(document.content_hash) &&
    getLegalDocumentFilePath(document.content_path) !== null
  );
}

export function getLegalDocumentFilePath(contentPath: string): string | null {
  const normalizedPath = contentPath.replaceAll("\\", "/");

  if (
    path.isAbsolute(contentPath) ||
    !normalizedPath.startsWith("docs/legal/") ||
    !normalizedPath.endsWith(".md") ||
    DRAFT_PATTERN.test(normalizedPath)
  ) {
    return null;
  }

  const projectRoot = path.resolve(process.cwd());
  const legalRoot = path.resolve(projectRoot, "docs/legal");
  const resolvedPath = path.resolve(projectRoot, normalizedPath);
  const relativePath = path.relative(legalRoot, resolvedPath);

  if (
    relativePath === "" ||
    relativePath.startsWith(`..${path.sep}`) ||
    relativePath === ".." ||
    path.isAbsolute(relativePath)
  ) {
    return null;
  }

  return resolvedPath;
}

export function hasMatchingContentHash(
  content: string | Buffer,
  expectedHash: string,
): boolean {
  if (!HASH_PATTERN.test(expectedHash)) {
    return false;
  }

  return createHash("sha256").update(content).digest("hex") === expectedHash;
}
