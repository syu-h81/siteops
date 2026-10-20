"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="space-y-5 text-center" role="status">
        <MailCheck
          aria-hidden="true"
          className="text-primary mx-auto size-12"
        />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">確認メールを送信しました</h2>
          <p className="text-muted-foreground text-sm leading-6">
            {submittedEmail}{" "}
            宛てのメールを開き、メールアドレスを確認してください。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
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
      className="space-y-5"
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
          <p id="signup-email-error" className="text-destructive text-sm">
            {form.formState.errors.email.message}
          </p>
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
        <p id="signup-password-help" className="text-muted-foreground text-xs">
          8文字以上で設定してください。
        </p>
        {form.formState.errors.password ? (
          <p id="signup-password-error" className="text-destructive text-sm">
            {form.formState.errors.password.message}
          </p>
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
          <p
            id="signup-password-confirmation-error"
            className="text-destructive text-sm"
          >
            {form.formState.errors.passwordConfirmation.message}
          </p>
        ) : null}
      </div>

      <Alert>
        Phase
        1-Bでは利用規約・プライバシーポリシーへの同意記録は行いません。正式文書の公開後、業務機能を利用する前に同意が必要になります。
      </Alert>

      <Button
        type="submit"
        className="h-10 w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : null}
        {form.formState.isSubmitting ? "登録中…" : "アカウントを作成"}
      </Button>
    </form>
  );
}
