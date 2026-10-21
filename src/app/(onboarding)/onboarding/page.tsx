import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingStatusCard } from "@/features/onboarding/components/onboarding-status-card";
import { getUsableCurrentLegalDocuments } from "@/lib/legal/documents";
import { getOnboardingStatus } from "@/lib/onboarding/get-onboarding-status";
import { getOnboardingPageRedirect } from "@/lib/onboarding/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "初期設定" };

export default async function OnboardingPage() {
  const status = await getOnboardingStatus();
  const redirectPath = getOnboardingPageRedirect(status);

  if (status === "unauthenticated" || status === "completed") {
    redirect(redirectPath ?? "/login");
  }

  const legalDocuments =
    status === "consent_required"
      ? await getUsableCurrentLegalDocuments(await createClient())
      : [];

  return (
    <OnboardingStatusCard legalDocuments={legalDocuments} status={status} />
  );
}
