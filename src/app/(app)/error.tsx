"use client";

import { OnboardingError } from "@/features/onboarding/components/onboarding-error";

export default function Error({ reset }: { reset: () => void }) {
  return <OnboardingError reset={reset} />;
}
