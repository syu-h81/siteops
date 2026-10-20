"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      className="space-y-5"
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
          <p id="login-email-error" className="text-destructive text-sm">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="login-password">パスワード</Label>
          <Link
            href="/forgot-password"
            className="text-primary text-sm hover:underline"
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
          <p id="login-password-error" className="text-destructive text-sm">
            {form.formState.errors.password.message}
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
        {form.formState.isSubmitting ? "ログイン中…" : "ログイン"}
      </Button>
    </form>
  );
}
