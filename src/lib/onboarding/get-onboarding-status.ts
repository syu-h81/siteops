import "server-only";

import { getUsableCurrentLegalDocuments } from "@/lib/legal/documents";
import { createClient } from "@/lib/supabase/server";
import {
  resolveOnboardingStatus,
  type CurrentLegalDocument,
  type OnboardingStatus,
} from "@/lib/onboarding/status";

export class OnboardingStateError extends Error {
  constructor() {
    super("オンボーディング状態を確認できませんでした。");
    this.name = "OnboardingStateError";
  }
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return "unauthenticated";
  }

  let currentLegalDocuments: CurrentLegalDocument[];

  try {
    currentLegalDocuments = await getUsableCurrentLegalDocuments(supabase);
  } catch {
    throw new OnboardingStateError();
  }
  const legalStatus = resolveOnboardingStatus({
    consentDocumentVersionIds: [],
    currentLegalDocuments,
    hasOrganization: false,
    userId: user.id,
  });

  if (legalStatus === "legal_unavailable") {
    return legalStatus;
  }

  const currentDocumentIds = currentLegalDocuments.map(
    (document) => document.id,
  );
  const { data: consents, error: consentsError } = await supabase
    .from("user_legal_consents")
    .select("document_version_id")
    .eq("user_id", user.id)
    .in("document_version_id", currentDocumentIds);

  if (consentsError) {
    throw new OnboardingStateError();
  }

  const consentDocumentVersionIds = consents.map(
    (consent) => consent.document_version_id,
  );
  const consentStatus = resolveOnboardingStatus({
    consentDocumentVersionIds,
    currentLegalDocuments,
    hasOrganization: false,
    userId: user.id,
  });

  if (consentStatus === "consent_required") {
    return consentStatus;
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (organizationError) {
    throw new OnboardingStateError();
  }

  return resolveOnboardingStatus({
    consentDocumentVersionIds,
    currentLegalDocuments,
    hasOrganization: Boolean(organization),
    userId: user.id,
  });
}
