"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/features/auth/components/form-message";
import { getAuthErrorMessage } from "@/features/auth/errors";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [supabase] = useState(createClient);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo,
    });

    if (error) {
      setFormError(
        getAuthErrorMessage(error, "再設定メールを送信できませんでした。"),
      );
      return;
    }

    setIsSent(true);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      <FormMessage message={formError} />
      <FormMessage
        message={
          isSent
            ? "登録されているメールアドレスの場合、パスワード再設定メールを送信しました。"
            : null
        }
        variant="success"
      />

      <div className="space-y-2">
        <Label htmlFor="forgot-email">メールアドレス</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          disabled={isSent}
          aria-invalid={Boolean(form.formState.errors.email)}
          aria-describedby={
            form.formState.errors.email ? "forgot-email-error" : undefined
          }
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p id="forgot-email-error" className="text-destructive text-sm">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="h-10 w-full"
        disabled={form.formState.isSubmitting || isSent}
      >
        {form.formState.isSubmitting ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : null}
        {form.formState.isSubmitting ? "送信中…" : "再設定メールを送信"}
      </Button>
    </form>
  );
}
