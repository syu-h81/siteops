import { describe, expect, it } from "vitest";

import {
  resolveOnboardingStatus,
  type CurrentLegalDocument,
} from "@/lib/onboarding/status";

const terms: CurrentLegalDocument = {
  document_type: "terms",
  id: "terms-current",
};
const privacy: CurrentLegalDocument = {
  document_type: "privacy",
  id: "privacy-current",
};

function resolve(
  overrides: Partial<Parameters<typeof resolveOnboardingStatus>[0]> = {},
) {
  return resolveOnboardingStatus({
    consentDocumentVersionIds: [terms.id, privacy.id],
    currentLegalDocuments: [terms, privacy],
    hasOrganization: true,
    userId: "user-1",
    ...overrides,
  });
}

describe("オンボーディング状態判定", () => {
  it("未認証ユーザーをunauthenticatedにする", () => {
    expect(resolve({ userId: null })).toBe("unauthenticated");
  });

  it.each([
    { documents: [], label: "文書がない" },
    { documents: [terms], label: "利用規約しかない" },
    { documents: [privacy], label: "プライバシーポリシーしかない" },
  ])("$label場合はlegal_unavailableにする", ({ documents }) => {
    expect(resolve({ currentLegalDocuments: documents })).toBe(
      "legal_unavailable",
    );
  });

  it.each([
    { consentIds: [], label: "同意がない" },
    { consentIds: [terms.id], label: "片方だけ同意している" },
    {
      consentIds: ["terms-old", privacy.id],
      label: "過去バージョンだけに同意している",
    },
  ])("$label場合はconsent_requiredにする", ({ consentIds }) => {
    expect(resolve({ consentDocumentVersionIds: consentIds })).toBe(
      "consent_required",
    );
  });

  it("同意済みで組織がなければorganization_requiredにする", () => {
    expect(resolve({ hasOrganization: false })).toBe("organization_required");
  });

  it("同意済みで組織があればcompletedにする", () => {
    expect(resolve()).toBe("completed");
  });
});
