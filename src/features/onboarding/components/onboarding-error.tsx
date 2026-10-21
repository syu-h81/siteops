"use client";

import { AlertTriangle } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/typography";

type OnboardingErrorProps = {
  reset: () => void;
};

export function OnboardingError({ reset }: OnboardingErrorProps) {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <AlertTriangle
            aria-hidden="true"
            className="text-destructive size-8"
          />
          <PageTitle>状態を確認できませんでした</PageTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            初期設定の状態を安全に確認できなかったため、処理を中断しました。時間をおいてもう一度お試しください。
          </Alert>
          <Button type="button" onClick={reset}>
            もう一度試す
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
