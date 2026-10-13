"use server";

import { getSiteUrl } from "@/lib/site-url";
import { createRecoveryEmailClient } from "@/lib/supabase/recovery";

export type ForgotPasswordState = {
  status: "idle" | "error" | "success";
  message?: string;
  email?: string;
  emailError?: string;
};

export async function requestPasswordReset(
  _previousState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const value = formData.get("email");
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { status: "error", email, emailError: "올바른 이메일 주소를 입력해 주세요." };
  }

  try {
    const siteUrl = getSiteUrl();
    const supabase = createRecoveryEmailClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
    if (error && error.code !== "user_not_found") {
      console.error("Password recovery email failed", { code: error.code, status: error.status });
      return {
        status: "error", email,
        message: error.status === 429
          ? "요청이 많아요. 잠시 기다린 뒤 다시 시도해 주세요."
          : "메일을 요청하지 못했어요. 잠시 후 다시 시도해 주세요.",
      };
    }
    return {
      status: "success",
      message: "가입된 이메일이면 비밀번호 재설정 링크를 보내드려요. 받은 편지함과 스팸함을 확인해 주세요.",
    };
  } catch {
    console.error("Password recovery email unavailable");
    return { status: "error", email, message: "메일을 요청하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
}
