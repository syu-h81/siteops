import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "メールアドレスを入力してください。")
  .max(320, "メールアドレスは320文字以内で入力してください。")
  .email("有効なメールアドレスを入力してください。");

const passwordSchema = z
  .string()
  .min(8, "パスワードは8文字以上で入力してください。")
  .max(128, "パスワードは128文字以内で入力してください。");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "パスワードを入力してください。"),
});

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: z
      .string()
      .min(1, "確認用パスワードを入力してください。"),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "パスワードが一致しません。",
    path: ["passwordConfirmation"],
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z
      .string()
      .min(1, "確認用パスワードを入力してください。"),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "パスワードが一致しません。",
    path: ["passwordConfirmation"],
  });

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
