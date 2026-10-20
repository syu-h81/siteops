import { z } from "zod";

export const PASSWORD_RECOVERY_COOKIE = "siteops-password-recovery";
export const PASSWORD_RECOVERY_MAX_AGE_SECONDS = 10 * 60;

export const recoveryTokenHashSchema = z
  .string()
  .min(1)
  .max(1024)
  .regex(/^[^\s\u0000-\u001f\u007f]+$/);

export function getPasswordRecoveryCookieOptions() {
  return {
    httpOnly: true,
    maxAge: PASSWORD_RECOVERY_MAX_AGE_SECONDS,
    path: "/reset-password",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
