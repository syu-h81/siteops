import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import type { Database } from "@/types/database.types";

export function createClient() {
  const { publishableKey, url } = getSupabaseEnvironment();

  return createBrowserClient<Database>(url, publishableKey, {
    cookieOptions: getSupabaseCookieOptions(),
  });
}
