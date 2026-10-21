import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  getLegalDocumentFilePath,
  hasMatchingContentHash,
  isFormalLegalDocument,
} from "@/lib/legal/document-policy";

const content = "# SiteOps 利用規約\n";
const contentHash = createHash("sha256").update(content).digest("hex");

const formalDocument = {
  content_hash: contentHash,
  content_path: "docs/legal/terms_v1.0.md",
  document_type: "terms" as const,
  id: "terms-1",
  version: "1.0",
};

describe("法務文書ポリシー", () => {
  it("正式文書のリポジトリ内Markdownパスを許可する", () => {
    expect(isFormalLegalDocument(formalDocument)).toBe(true);
    expect(getLegalDocumentFilePath(formalDocument.content_path)).toMatch(
      /docs\/legal\/terms_v1\.0\.md$/,
    );
  });

  it.each([
    {
      content_path: "docs/legal/terms_v0.1_draft.md",
      version: "0.1",
    },
    {
      content_path: "docs/legal/terms_v1.0.md",
      version: "1.0-draft",
    },
    {
      content_path: "../terms_v1.0.md",
      version: "1.0",
    },
    {
      content_path: "/tmp/terms_v1.0.md",
      version: "1.0",
    },
  ])("草案または許可範囲外のパスを拒否する", (overrides) => {
    expect(isFormalLegalDocument({ ...formalDocument, ...overrides })).toBe(
      false,
    );
  });

  it("本文のSHA-256が一致する場合だけ許可する", () => {
    expect(hasMatchingContentHash(content, contentHash)).toBe(true);
    expect(hasMatchingContentHash(`${content}改変`, contentHash)).toBe(false);
  });
});
