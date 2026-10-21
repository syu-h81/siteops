export type OnboardingStatus =
  | "unauthenticated"
  | "legal_unavailable"
  | "consent_required"
  | "organization_required"
  | "completed";

export type CurrentLegalDocument = {
  document_type: string;
  id: string;
};

type OnboardingSnapshot = {
  consentDocumentVersionIds: readonly string[];
  currentLegalDocuments: readonly CurrentLegalDocument[];
  hasOrganization: boolean;
  userId: string | null;
};

export function resolveOnboardingStatus({
  consentDocumentVersionIds,
  currentLegalDocuments,
  hasOrganization,
  userId,
}: OnboardingSnapshot): OnboardingStatus {
  if (!userId) {
    return "unauthenticated";
  }

  const currentDocumentIds = new Map(
    currentLegalDocuments.map((document) => [
      document.document_type,
      document.id,
    ]),
  );
  const termsDocumentId = currentDocumentIds.get("terms");
  const privacyDocumentId = currentDocumentIds.get("privacy");

  if (!termsDocumentId || !privacyDocumentId) {
    return "legal_unavailable";
  }

  const consentIds = new Set(consentDocumentVersionIds);

  if (!consentIds.has(termsDocumentId) || !consentIds.has(privacyDocumentId)) {
    return "consent_required";
  }

  return hasOrganization ? "completed" : "organization_required";
}
