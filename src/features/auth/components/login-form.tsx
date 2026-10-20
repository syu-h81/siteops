"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { FormMessage } from "@/features/auth/components/form-message";
import { getAuthErrorMessage } from "@/features/auth/errors";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { getSafeRedirectPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  nextPath?: string;
  notice?: string;
};

export function LoginForm({ nextPath, notice }: LoginFormProps) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }

    router.replace(getSafeRedirectPath(nextPath));
    router.refresh();
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
    >
      <FormMessage message={notice} variant="success" />
      <FormMessage message={formError} />

      <div className="space-y-2">
        <Label htmlFor="login-email">メールアドレス</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={Boolean(form.formState.errors.email)}
          aria-describedby={
            form.formState.errors.email ? "login-email-error" : undefined
          }
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <FormError id="login-email-error">
            {form.formState.errors.email.message}
          </FormError>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="login-password">パスワード</Label>
          <Link
            href="/forgot-password"
            className="text-primary hover:text-primary-hover focus-visible:ring-ring rounded-sm text-sm font-medium underline-offset-4 transition-colors duration-150 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            パスワードを忘れた方
          </Link>
        </div>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          aria-describedby={
            form.formState.errors.password ? "login-password-error" : undefined
          }
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <FormError id="login-password-error">
            {form.formState.errors.password.message}
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
          <LoadingIndicator label="ログイン中…" />
        ) : (
          "ログイン"
        )}
      </Button>
    </form>
  );
}
