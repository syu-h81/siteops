import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUsableCurrentLegalDocuments: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/lib/legal/documents", () => ({
  findLegalDocument: (
    documents: { document_type: string }[],
    documentType: string,
  ) =>
    documents.find((document) => document.document_type === documentType) ??
    null,
  getUsableCurrentLegalDocuments: mocks.getUsableCurrentLegalDocuments,
}));

import { LegalDocumentPage } from "@/features/legal/components/legal-document-page";

describe("法務文書ページ", () => {
  it("DBから取得した本文とバージョンを表示する", async () => {
    mocks.createClient.mockResolvedValue({});
    mocks.getUsableCurrentLegalDocuments.mockResolvedValue([
      {
        content_hash: "a".repeat(64),
        content_markdown: "# DB本文\nDBに保存された内容です。\n",
        document_type: "terms",
        effective_at: "2026-01-01T00:00:00.000Z",
        id: "00000000-0000-4000-8000-000000000001",
        published_at: "2026-01-01T00:00:00.000Z",
        version: "1.0",
      },
    ]);

    const markup = renderToStaticMarkup(
      await LegalDocumentPage({ documentType: "terms" }),
    );

    expect(markup).toContain("DB本文");
    expect(markup).toContain("DBに保存された内容です。");
    expect(markup).toContain("現行バージョン：1.0");
  });

  it("正式文書がない場合は準備中表示にする", async () => {
    mocks.createClient.mockResolvedValue({});
    mocks.getUsableCurrentLegalDocuments.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await LegalDocumentPage({ documentType: "privacy" }),
    );

    expect(markup).toContain("正式文書を準備中です。");
  });

  it("DB取得エラーを準備中表示へ変換しない", async () => {
    mocks.createClient.mockResolvedValue({});
    mocks.getUsableCurrentLegalDocuments.mockRejectedValue(
      new Error("database unavailable"),
    );

    await expect(LegalDocumentPage({ documentType: "terms" })).rejects.toThrow(
      "database unavailable",
    );
  });
});
