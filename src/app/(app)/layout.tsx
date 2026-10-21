import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getOnboardingStatus } from "@/lib/onboarding/get-onboarding-status";
import { getProtectedAppRedirect } from "@/lib/onboarding/navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const status = await getOnboardingStatus();
  const redirectPath = getProtectedAppRedirect(status);

  if (redirectPath) {
    redirect(redirectPath);
  }

  return <div className="flex min-h-svh flex-1 flex-col">{children}</div>;
}
