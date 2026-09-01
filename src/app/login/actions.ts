"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { persistentPreferenceCookieOptions, rememberLoginCookieName, sessionPreferenceCookieOptions } from "@/lib/supabase/auth-cookies";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  status: "idle" | "error";
  message?: string;
  fields?: {
    email?: string;
    rememberLogin?: boolean;
  };
  errors?: Partial<Record<"email" | "password", string>>;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const rememberLogin = formData.get("rememberLogin") === "on";
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const errors: LoginState["errors"] = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = "올바른 이메일 주소를 입력해 주세요.";
  }

  if (!password) {
    errors.password = "비밀번호를 입력해 주세요.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "입력한 내용을 다시 확인해 주세요.",
      fields: { email, rememberLogin },
      errors,
    };
  }

  const supabase = await createClient({ rememberLogin });
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Supabase login failed", {
      code: error.code,
      status: error.status,
    });

    return {
      status: "error",
      message: "이메일 또는 비밀번호를 확인해 주세요.",
      fields: { email, rememberLogin },
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    rememberLoginCookieName,
    rememberLogin ? "1" : "0",
    rememberLogin ? persistentPreferenceCookieOptions() : sessionPreferenceCookieOptions(),
  );

  redirect("/");
}
