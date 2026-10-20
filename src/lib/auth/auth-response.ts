import { type NextRequest, NextResponse } from "next/server";

const AUTH_CACHE_CONTROL =
  "private, no-cache, no-store, must-revalidate, max-age=0";

export function createAuthRedirect(
  request: NextRequest,
  path: string,
  supabaseHeaders?: Headers,
) {
  const response = NextResponse.redirect(new URL(path, request.url));

  supabaseHeaders?.forEach((value, name) => {
    response.headers.set(name, value);
  });

  response.headers.set("Cache-Control", AUTH_CACHE_CONTROL);
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
}
