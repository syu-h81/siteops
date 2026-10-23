import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { getOnboardingStatus } from "@/lib/onboarding/get-onboarding-status";
import { getProtectedAppRedirect } from "@/lib/onboarding/navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const status = await getOnboardingStatus();
  const redirectPath = getProtectedAppRedirect(status);

  if (redirectPath) {
    redirect(redirectPath);
  }

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <header className="border-border bg-surface border-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <p className="text-primary truncate text-sm font-bold tracking-[0.2em]">
            SITEOPS
          </p>
          <LogoutButton />
        </div>
      </header>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
