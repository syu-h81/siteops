"use client";

import { AlertTriangle } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/typography";

type LegalErrorProps = {
  reset: () => void;
};

export default function LegalError({ reset }: LegalErrorProps) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12 sm:px-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <AlertTriangle
            aria-hidden="true"
            className="text-destructive size-8"
          />
          <PageTitle>法務文書を読み込めませんでした</PageTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            時間をおいて、もう一度お試しください。
          </Alert>
          <Button className="w-full" onClick={reset}>
            再読み込み
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
