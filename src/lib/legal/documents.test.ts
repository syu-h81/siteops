import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getUsableCurrentLegalDocuments,
  LegalDocumentStateError,
} from "@/lib/legal/documents";
import type { Database } from "@/types/database.types";

function sha256(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function createSupabaseClient(response: {
  data: unknown[];
  error: { message: string } | null;
}) {
  const query = {
    eq: vi.fn(),
    in: vi.fn(),
    lte: vi.fn(),
    select: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.lte.mockReturnValueOnce(query).mockResolvedValueOnce(response);

  const from = vi.fn().mockReturnValue(query);
  const client = { from } as unknown as SupabaseClient<Database>;

  return { client, from, query };
}

const publishedDocument = {
  content_markdown: "# 利用規約\n本文です。\n",
  document_type: "terms",
  effective_at: "2026-01-01T00:00:00.000Z",
  id: "00000000-0000-4000-8000-000000000001",
  published_at: "2026-01-01T00:00:00.000Z",
  version: "1.0",
};

describe("DB法務文書取得", () => {
  it("公開済みDB本文を取得し、本文のSHA-256を検証する", async () => {
    const contentHash = sha256(publishedDocument.content_markdown);
    const { client, from, query } = createSupabaseClient({
      data: [{ ...publishedDocument, content_hash: contentHash }],
      error: null,
    });

    await expect(
      getUsableCurrentLegalDocuments(
        client,
        new Date("2026-10-22T00:00:00.000Z"),
      ),
    ).resolves.toEqual([{ ...publishedDocument, content_hash: contentHash }]);
    expect(from).toHaveBeenCalledWith("legal_document_versions");
    expect(query.eq).toHaveBeenCalledWith("publication_status", "published");
    expect(query.eq).toHaveBeenCalledWith("is_current", true);
  });

  it.each([
    ["ハッシュ不一致", { content_hash: "0".repeat(64) }],
    ["CRLF", { content_markdown: "# 利用規約\r\n" }],
    ["末尾改行なし", { content_markdown: "# 利用規約" }],
    ["空本文", { content_markdown: "\n" }],
  ])("%sの本文を正式文書として扱わない", async (_label, change) => {
    const content =
      "content_markdown" in change
        ? change.content_markdown
        : publishedDocument.content_markdown;
    const { client } = createSupabaseClient({
      data: [
        {
          ...publishedDocument,
          content_hash: sha256(content),
          ...change,
        },
      ],
      error: null,
    });

    await expect(getUsableCurrentLegalDocuments(client)).resolves.toEqual([]);
  });

  it("DB取得エラーを文書未登録に変換しない", async () => {
    const { client } = createSupabaseClient({
      data: [],
      error: { message: "database unavailable" },
    });

    await expect(getUsableCurrentLegalDocuments(client)).rejects.toBeInstanceOf(
      LegalDocumentStateError,
    );
  });
});
