"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormDescription, FormError } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { resetPassword } from "@/features/auth/actions";
import { FormMessage } from "@/features/auth/components/form-message";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/features/auth/schemas";

export function ResetPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", passwordConfirmation: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setFormError(null);
    const result = await resetPassword(values);

    if (result?.error) {
      setFormError(result.error);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
    >
      <FormMessage message={formError} />

      <div className="space-y-2">
        <Label htmlFor="reset-password">新しいパスワード</Label>
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          aria-describedby="reset-password-help reset-password-error"
          {...form.register("password")}
        />
        <FormDescription id="reset-password-help">
          8文字以上で設定してください。
        </FormDescription>
        {form.formState.errors.password ? (
          <FormError id="reset-password-error">
            {form.formState.errors.password.message}
          </FormError>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-password-confirmation">
          新しいパスワード（確認）
        </Label>
        <Input
          id="reset-password-confirmation"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(form.formState.errors.passwordConfirmation)}
          aria-describedby={
            form.formState.errors.passwordConfirmation
              ? "reset-password-confirmation-error"
              : undefined
          }
          {...form.register("passwordConfirmation")}
        />
        {form.formState.errors.passwordConfirmation ? (
          <FormError id="reset-password-confirmation-error">
            {form.formState.errors.passwordConfirmation.message}
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
          <LoadingIndicator label="更新中…" />
        ) : (
          "パスワードを更新"
        )}
      </Button>
    </form>
  );
}
