import type { CookieOptionsWithName } from "@supabase/ssr";

export function getSupabaseCookieOptions(): CookieOptionsWithName {
  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}
