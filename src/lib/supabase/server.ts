import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import type { Database } from "@/types/database.types";

export async function createClient(responseHeaders?: Headers) {
  const cookieStore = await cookies();
  const { publishableKey, url } = getSupabaseEnvironment();

  return createServerClient<Database>(url, publishableKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });

          if (responseHeaders) {
            Object.entries(headers).forEach(([name, value]) => {
              responseHeaders.set(name, value);
            });
          }
        } catch {
          // Server Components cannot mutate the outgoing response. Proxy handles
          // refreshes there; Route Handlers pass responseHeaders explicitly.
        }
      },
    },
  });
}
