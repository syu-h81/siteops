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
});
