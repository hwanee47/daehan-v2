import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "비밀번호 찾기 | Daehan",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="비밀번호를 잊으셨나요?" description="가입한 이메일로 비밀번호 재설정 링크를 보내드려요.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
