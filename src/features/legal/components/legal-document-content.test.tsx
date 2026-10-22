import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LegalDocumentContent } from "@/features/legal/components/legal-document-content";

describe("法務文書本文", () => {
  it("HTMLを実行せずテキストとしてエスケープする", () => {
    const markup = renderToStaticMarkup(
      <LegalDocumentContent
        content={'# 規約\n<script>alert("xss")</script>'}
      />,
    );

    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toContain("<script>");
    expect(markup).not.toContain("dangerouslySetInnerHTML");
  });

  it("Markdown内の危険なURLをリンクとして実行しない", () => {
    const markup = renderToStaticMarkup(
      <LegalDocumentContent content="[外部リンク](javascript:alert('xss'))" />,
    );

    expect(markup).not.toContain("<a");
    expect(markup).not.toContain('href="javascript:');
    expect(markup).toContain("javascript:alert");
  });
});
