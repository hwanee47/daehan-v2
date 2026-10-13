"use server";

import { redirect } from "next/navigation";
import { clearRecoveryCookies, createRecoveryClient } from "@/lib/supabase/recovery";

export type ResetPasswordState = {
  status: "idle" | "error";
  message?: string;
  expired?: boolean;
  errors?: Partial<Record<"password" | "passwordConfirm", string>>;
};

export async function resetPassword(
  _previousState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const value = formData.get("password");
  const confirm = formData.get("passwordConfirm");
  const password = typeof value === "string" ? value : "";
  const errors: ResetPasswordState["errors"] = {};
  if (password.length < 8 || password.length > 72) {
    errors.password = "비밀번호는 8자 이상 72자 이하로 입력해 주세요.";
  }
  if (password !== confirm) errors.passwordConfirm = "비밀번호가 일치하지 않아요.";
  if (Object.keys(errors).length) return { status: "error", errors };

  try {
    const supabase = await createRecoveryClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { status: "error", expired: true, message: "재설정 시간이 지났어요. 복구 메일을 다시 요청해 주세요." };
    }
    if (formData.get("expectedUserId") !== user.id) {
      return { status: "error", message: "다른 계정의 복구 링크가 열렸어요. 페이지를 새로고침한 뒤 계정을 확인해 주세요." };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      console.error("Password reset failed", { code: error.code, status: error.status });
      const message = error.code === "same_password"
        ? "기존 비밀번호와 다른 비밀번호를 입력해 주세요."
        : error.code === "weak_password"
          ? "더 안전한 비밀번호를 입력해 주세요. 영문, 숫자, 특수문자를 조합해 주세요."
          : "비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.";
      return { status: "error", message };
    }

    // The password has already changed: sign-out failure must not report a failed reset.
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) console.error("Recovery signout failed", { code: signOutError.code });
    } catch {
      console.error("Recovery signout unavailable");
    }
    await clearRecoveryCookies();
  } catch {
    console.error("Password reset unavailable");
    return { status: "error", message: "비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  // Cookie mutations re-render this page; use a separate completion URL.
  redirect("/reset-password?status=success");
}
