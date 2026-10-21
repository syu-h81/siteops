import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

import { LegalConsentForm } from "@/features/onboarding/components/legal-consent-form";

const baseDocument = {
  content_hash: "a".repeat(64),
  content_path: "docs/legal/document_v1.0.md",
  id: "document-1",
  version: "1.0",
};

describe("法務同意フォーム", () => {
  it("チェックボックスを未選択で表示し、送信を無効にする", () => {
    const markup = renderToStaticMarkup(
      <LegalConsentForm
        privacyDocument={{
          ...baseDocument,
          content_path: "docs/legal/privacy_v1.0.md",
          document_type: "privacy",
          id: "privacy-1",
        }}
        termsDocument={{
          ...baseDocument,
          content_path: "docs/legal/terms_v1.0.md",
          document_type: "terms",
          id: "terms-1",
        }}
      />,
    );

    expect(markup.match(/type="checkbox"/g)).toHaveLength(2);
    expect(markup).not.toContain('checked=""');
    expect(markup.replaceAll("\n", "")).toMatch(
      /<button[^>]*disabled=""[^>]*>.*同意して次へ/,
    );
    expect(markup).toContain("バージョン 1.0");
  });
});
