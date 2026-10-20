import Link from "next/link";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { PageTitle } from "@/components/ui/typography";

type AuthShellProps = {
  children: ReactNode;
  description: string;
  footer?: ReactNode;
  title: string;
};

export function AuthShell({
  children,
  description,
  footer,
  title,
}: AuthShellProps) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="text-primary hover:text-primary-hover focus-visible:ring-ring mx-auto mb-6 block w-fit rounded-sm text-sm font-bold tracking-[0.2em] transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          SITEOPS
        </Link>
        <Card>
          <CardHeader>
            <PageTitle>{title}</PageTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
          {footer ? (
            <CardFooter className="justify-center border-t pt-6 text-sm">
              {footer}
            </CardFooter>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
