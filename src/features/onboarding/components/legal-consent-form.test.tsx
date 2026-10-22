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
  effective_at: "2026-01-01T00:00:00.000Z",
  id: "00000000-0000-4000-8000-000000000001",
  published_at: "2026-01-01T00:00:00.000Z",
  version: "1.0",
};

describe("法務同意フォーム", () => {
  it("チェックボックスを未選択で表示し、送信を無効にする", () => {
    const markup = renderToStaticMarkup(
      <LegalConsentForm
        privacyDocument={{
          ...baseDocument,
          content_hash: "b".repeat(64),
          document_type: "privacy",
          id: "00000000-0000-4000-8000-000000000002",
        }}
        termsDocument={{
          ...baseDocument,
          document_type: "terms",
        }}
      />,
    );

    expect(markup.match(/type="checkbox"/g)).toHaveLength(2);
    expect(markup).not.toContain('checked=""');
    expect(markup.replaceAll("\n", "")).toMatch(
      /<button[^>]*disabled=""[^>]*>.*同意して次へ/,
    );
    expect(markup).toContain("バージョン 1.0");
    expect(markup).toContain('name="termsAccepted"');
    expect(markup).toContain('name="privacyAccepted"');
    expect(markup).toContain('name="termsDocumentId"');
    expect(markup).toContain('name="termsContentHash"');
    expect(markup).toContain('name="privacyDocumentId"');
    expect(markup).toContain('name="privacyContentHash"');
  });
});
