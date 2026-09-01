import type { CookieOptions } from "@supabase/ssr";

export const rememberLoginCookieName = "daehan-remember-login";
export const rememberLoginMaxAge = 30 * 24 * 60 * 60;

export function persistentPreferenceCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    maxAge: rememberLoginMaxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

export function sessionPreferenceCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

export function normalizeAuthCookieOptions(options: CookieOptions, rememberLogin: boolean): CookieOptions {
  if (options.maxAge !== undefined && options.maxAge <= 0) return options;
  const sessionOptions = { ...options };
  delete sessionOptions.expires;
  delete sessionOptions.maxAge;
  return rememberLogin ? { ...sessionOptions, maxAge: rememberLoginMaxAge } : sessionOptions;
}
