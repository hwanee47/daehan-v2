import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "./config";

const recoveryCookieName = "daehan-recovery-auth";
const recoveryMaxAge = 15 * 60;
const isRecoveryCookie = (name: string) =>
  name === recoveryCookieName || name.startsWith(`${recoveryCookieName}.`);

function recoveryCookieOptions(options: CookieOptions = {}): CookieOptions {
  return {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: options.maxAge !== undefined && options.maxAge <= 0 ? 0 : recoveryMaxAge,
  };
}

// Keep recovery authority separate from the account already signed into this browser.
export async function createRecoveryClient(options: { readOnly?: boolean } = {}) {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();
  return createServerClient(url, publishableKey, {
    cookieOptions: { name: recoveryCookieName, ...recoveryCookieOptions() },
    cookies: {
      getAll: () => cookieStore.getAll().filter(({ name }) => isRecoveryCookie(name)),
      setAll(values) {
        if (options.readOnly) return;
        values.forEach(({ name, value, options: cookieOptions }) => {
          if (isRecoveryCookie(name)) cookieStore.set(name, value, recoveryCookieOptions(cookieOptions));
        });
      },
    },
  });
}

export async function clearRecoveryCookies() {
  const cookieStore = await cookies();
  cookieStore.getAll().forEach(({ name }) => {
    if (isRecoveryCookie(name)) cookieStore.set(name, "", recoveryCookieOptions({ maxAge: 0 }));
  });
}

// TokenHash email verification works across browsers without a PKCE verifier cookie.
export function createRecoveryEmailClient() {
  const { url, publishableKey } = getSupabaseConfig();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
