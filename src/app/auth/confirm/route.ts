import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { createAuthRedirect } from "@/lib/auth/auth-response";
import {
  getPasswordRecoveryCookieOptions,
  PASSWORD_RECOVERY_COOKIE,
  recoveryTokenHashSchema,
} from "@/lib/auth/password-recovery";
import { getSafeRedirectPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

const emailOtpTypeSchema = z.enum([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function GET(request: NextRequest) {
  const tokenResult = recoveryTokenHashSchema.safeParse(
    request.nextUrl.searchParams.get("token_hash"),
  );
  const typeResult = emailOtpTypeSchema.safeParse(
    request.nextUrl.searchParams.get("type"),
  );

  if (!tokenResult.success || !typeResult.success) {
    return createAuthRedirect(request, "/auth/error");
  }

  if (typeResult.data === "recovery") {
    const response = createAuthRedirect(request, "/reset-password");
    response.cookies.set(
      PASSWORD_RECOVERY_COOKIE,
      tokenResult.data,
      getPasswordRecoveryCookieOptions(),
    );

    return response;
  }

  const supabaseHeaders = new Headers();
  const supabase = await createClient(supabaseHeaders);
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenResult.data,
    type: typeResult.data as EmailOtpType,
  });

  if (error) {
    return createAuthRedirect(request, "/auth/error", supabaseHeaders);
  }

  const nextPath = getSafeRedirectPath(
    request.nextUrl.searchParams.get("next"),
  );

  return createAuthRedirect(request, nextPath, supabaseHeaders);
}
