"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import {
  legalConsentSchema,
  type LegalConsentValues,
} from "@/features/onboarding/schemas";
import type { LegalDocumentMetadata } from "@/lib/legal/document-policy";

type LegalConsentFormProps = {
  privacyDocument: LegalDocumentMetadata;
  termsDocument: LegalDocumentMetadata;
};

type ConsentResponse = {
  data?: { status?: string };
  error?: { message?: string };
};

export function LegalConsentForm({
  privacyDocument,
  termsDocument,
}: LegalConsentFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LegalConsentValues>({
    resolver: zodResolver(legalConsentSchema),
    defaultValues: {
      acceptPrivacy: false,
      acceptTerms: false,
      privacyVersion: privacyDocument.version,
      termsVersion: termsDocument.version,
    },
  });
  const acceptTerms = useWatch({
    control: form.control,
    name: "acceptTerms",
  });
  const acceptPrivacy = useWatch({
    control: form.control,
    name: "acceptPrivacy",
  });

  async function onSubmit(values: LegalConsentValues) {
    setFormError(null);

    try {
      const response = await fetch("/api/v1/onboarding/consent", {
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as ConsentResponse;

      if (!response.ok) {
        setFormError(
          body.error?.message ??
            "同意を記録できませんでした。時間をおいてもう一度お試しください。",
        );
        return;
      }

      if (body.data?.status === "completed") {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      router.refresh();
    } catch {
      setFormError(
        "同意を記録できませんでした。通信環境を確認してもう一度お試しください。",
      );
    }
  }

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      {formError ? <Alert variant="destructive">{formError}</Alert> : null}

      <div className="border-border space-y-5 rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <input
            id="accept-terms"
            type="checkbox"
            className="border-input text-primary focus-visible:ring-ring mt-0.5 size-5 shrink-0 rounded focus-visible:ring-3"
            aria-describedby="terms-document-version"
            {...form.register("acceptTerms")}
          />
          <div className="min-w-0 space-y-1">
            <Label htmlFor="accept-terms">利用規約に同意します</Label>
            <p
              id="terms-document-version"
              className="text-muted-foreground text-xs leading-5"
            >
              対象：利用規約 バージョン {termsDocument.version}
            </p>
            <Link
              className="text-primary inline-block text-sm underline-offset-4 hover:underline"
              href="/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              利用規約を確認する
            </Link>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="accept-privacy"
            type="checkbox"
            className="border-input text-primary focus-visible:ring-ring mt-0.5 size-5 shrink-0 rounded focus-visible:ring-3"
            aria-describedby="privacy-document-version"
            {...form.register("acceptPrivacy")}
          />
          <div className="min-w-0 space-y-1">
            <Label htmlFor="accept-privacy">
              プライバシーポリシーに同意します
            </Label>
            <p
              id="privacy-document-version"
              className="text-muted-foreground text-xs leading-5"
            >
              対象：プライバシーポリシー バージョン {privacyDocument.version}
            </p>
            <Link
              className="text-primary inline-block text-sm underline-offset-4 hover:underline"
              href="/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              プライバシーポリシーを確認する
            </Link>
          </div>
        </div>
      </div>

      {form.formState.errors.acceptTerms ||
      form.formState.errors.acceptPrivacy ? (
        <FormError>
          利用規約とプライバシーポリシーの両方への同意が必要です。
        </FormError>
      ) : null}

      <Button
        type="submit"
        className="h-10 w-full sm:h-9"
        disabled={!acceptTerms || !acceptPrivacy || form.formState.isSubmitting}
        aria-busy={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? (
          <LoadingIndicator label="同意を記録中…" />
        ) : (
          "同意して次へ"
        )}
      </Button>
    </form>
  );
}
