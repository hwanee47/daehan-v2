import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { normalizeAuthCookieOptions, rememberLoginCookieName } from "./auth-cookies";
import { getSupabaseConfig } from "./config";

export async function createClient(options?: { rememberLogin?: boolean }) {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();
  const rememberLogin = options?.rememberLogin ?? cookieStore.get(rememberLoginCookieName)?.value === "1";

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
            cookieStore.set(name, value, normalizeAuthCookieOptions(cookieOptions, rememberLogin)),
          );
        } catch {
          // Server Components cannot write cookies. proxy.ts refreshes the session.
        }
      },
    },
  });
}
