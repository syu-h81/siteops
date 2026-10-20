"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormDescription, FormError } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { SectionTitle } from "@/components/ui/typography";
import { FormMessage } from "@/features/auth/components/form-message";
import { getAuthErrorMessage } from "@/features/auth/errors";
import { signupSchema, type SignupValues } from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const [supabase] = useState(createClient);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", passwordConfirmation: "" },
  });

  async function onSubmit(values: SignupValues) {
    setFormError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/login?confirmed=1`;
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }

    setSubmittedEmail(values.email);
    form.reset();
  }

  if (submittedEmail) {
    return (
      <div className="space-y-4 text-center" role="status">
        <MailCheck aria-hidden="true" className="text-success mx-auto size-8" />
        <div className="space-y-2">
          <SectionTitle>確認メールを送信しました</SectionTitle>
          <p className="text-muted-foreground text-sm leading-6">
            <span className="break-all">{submittedEmail}</span>{" "}
            宛てのメールを開き、メールアドレスを確認してください。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 sm:h-9"
          onClick={() => setSubmittedEmail(null)}
        >
          メールアドレスを修正する
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
    >
      <FormMessage message={formError} />

      <div className="space-y-2">
        <Label htmlFor="signup-email">メールアドレス</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={Boolean(form.formState.errors.email)}
          aria-describedby={
            form.formState.errors.email ? "signup-email-error" : undefined
          }
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <FormError id="signup-email-error">
            {form.formState.errors.email.message}
          </FormError>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">パスワード</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          aria-describedby="signup-password-help signup-password-error"
          {...form.register("password")}
        />
        <FormDescription id="signup-password-help">
          8文字以上で設定してください。
        </FormDescription>
        {form.formState.errors.password ? (
          <FormError id="signup-password-error">
            {form.formState.errors.password.message}
          </FormError>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password-confirmation">パスワード（確認）</Label>
        <Input
          id="signup-password-confirmation"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(form.formState.errors.passwordConfirmation)}
          aria-describedby={
            form.formState.errors.passwordConfirmation
              ? "signup-password-confirmation-error"
              : undefined
          }
          {...form.register("passwordConfirmation")}
        />
        {form.formState.errors.passwordConfirmation ? (
          <FormError id="signup-password-confirmation-error">
            {form.formState.errors.passwordConfirmation.message}
          </FormError>
        ) : null}
      </div>

      <Alert variant="info">
        Phase
        1-Bでは利用規約・プライバシーポリシーへの同意記録は行いません。正式文書の公開後、業務機能を利用する前に同意が必要になります。
      </Alert>

      <Button
        type="submit"
        className="h-10 w-full sm:h-9"
        disabled={form.formState.isSubmitting}
        aria-busy={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? (
          <LoadingIndicator label="登録中…" />
        ) : (
          "アカウントを作成"
        )}
      </Button>
    </form>
  );
}
