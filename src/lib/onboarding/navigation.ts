import type { OnboardingStatus } from "@/lib/onboarding/status";

export function getOnboardingPageRedirect(status: OnboardingStatus) {
  if (status === "unauthenticated") {
    return "/login";
  }

  return status === "completed" ? "/dashboard" : null;
}

export function getProtectedAppRedirect(status: OnboardingStatus) {
  if (status === "unauthenticated") {
    return "/login";
  }

  return status === "completed" ? null : "/onboarding";
}
