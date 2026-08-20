"use server";

import { createClient } from "@/lib/supabase/server";

export type SignupState = {
  status: "idle" | "error" | "success";
  message?: string;
  fields?: {
    email?: string;
    name?: string;
  };
  errors?: Partial<Record<"email" | "name" | "password" | "passwordConfirm", string>>;
};

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signup(
  _previousState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const name = getText(formData, "name");
  const email = getText(formData, "email").toLowerCase();
  const passwordValue = formData.get("password");
  const passwordConfirmValue = formData.get("passwordConfirm");
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const passwordConfirm =
    typeof passwordConfirmValue === "string" ? passwordConfirmValue : "";

  const errors: SignupState["errors"] = {};

  if (name.length < 2 || name.length > 50) {
    errors.name = "이름은 2자 이상 50자 이하로 입력해 주세요.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = "올바른 이메일 주소를 입력해 주세요.";
  }

  if (password.length < 8 || password.length > 72) {
    errors.password = "비밀번호는 8자 이상 72자 이하로 입력해 주세요.";
  }

  if (password !== passwordConfirm) {
    errors.passwordConfirm = "비밀번호가 일치하지 않아요.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "입력한 내용을 다시 확인해 주세요.",
      fields: { email, name },
      errors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    console.error("Supabase signup failed", {
      code: error.code,
      status: error.status,
    });

    return {
      status: "error",
      message: "회원가입을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
      fields: { email, name },
    };
  }

  return {
    status: "success",
    message: "가입 신청이 완료됐어요. 이메일로 받은 인증 링크를 확인해 주세요.",
  };
}
