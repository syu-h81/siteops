"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      className="space-y-5"
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
        <p id="reset-password-help" className="text-muted-foreground text-xs">
          8文字以上で設定してください。
        </p>
        {form.formState.errors.password ? (
          <p id="reset-password-error" className="text-destructive text-sm">
            {form.formState.errors.password.message}
          </p>
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
          <p
            id="reset-password-confirmation-error"
            className="text-destructive text-sm"
          >
            {form.formState.errors.passwordConfirmation.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="h-10 w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : null}
        {form.formState.isSubmitting ? "更新中…" : "パスワードを更新"}
      </Button>
    </form>
  );
}
