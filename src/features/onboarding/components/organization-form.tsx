"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormDescription, FormError } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import {
  organizationSchema,
  type OrganizationValues,
} from "@/features/onboarding/schemas";

type OrganizationResponse = {
  data?: { redirectTo?: string };
  error?: { message?: string };
};

export function OrganizationForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: OrganizationValues) {
    setFormError(null);

    try {
      const response = await fetch("/api/v1/onboarding", {
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as OrganizationResponse;

      if (!response.ok) {
        setFormError(
          body.error?.message ??
            "組織を作成できませんでした。時間をおいてもう一度お試しください。",
        );
        return;
      }

      if (body.data?.redirectTo !== "/dashboard") {
        setFormError("初期設定の完了を確認できませんでした。");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setFormError(
        "組織を作成できませんでした。通信環境を確認してもう一度お試しください。",
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

      <div className="space-y-2">
        <Label htmlFor="organization-name">
          組織名<span className="text-destructive">*</span>
        </Label>
        <Input
          id="organization-name"
          autoComplete="organization"
          maxLength={200}
          aria-invalid={Boolean(form.formState.errors.name)}
          aria-describedby={
            form.formState.errors.name
              ? "organization-name-help organization-name-error"
              : "organization-name-help"
          }
          {...form.register("name")}
        />
        <FormDescription id="organization-name-help">
          会社名、屋号、または活動名を入力してください。
        </FormDescription>
        {form.formState.errors.name ? (
          <FormError id="organization-name-error">
            {form.formState.errors.name.message}
          </FormError>
        ) : null}
      </div>

      <Button
        type="submit"
        className="h-10 w-full sm:h-9"
        disabled={form.formState.isSubmitting}
        aria-busy={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? (
          <LoadingIndicator label="組織を作成中…" />
        ) : (
          "組織を作成"
        )}
      </Button>
    </form>
  );
}
