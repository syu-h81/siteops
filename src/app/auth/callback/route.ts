import type { NextRequest } from "next/server";

import { createAuthRedirect } from "@/lib/auth/auth-response";
import { getSafeRedirectPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return createAuthRedirect(request, "/auth/error");
  }

  const flowId = request.nextUrl.searchParams.get("sb_flow_id") ?? undefined;
  const supabaseHeaders = new Headers();
  const supabase = await createClient(supabaseHeaders);
  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  if (error) {
    return createAuthRedirect(request, "/auth/error", supabaseHeaders);
  }

  const nextPath = getSafeRedirectPath(
    request.nextUrl.searchParams.get("next"),
  );
  const destination = nextPath.startsWith("/reset-password") ? "/" : nextPath;

  return createAuthRedirect(request, destination, supabaseHeaders);
}
