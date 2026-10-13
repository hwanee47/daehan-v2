import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { createRecoveryClient } from "@/lib/supabase/recovery";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "비밀번호 재설정 | Daehan",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({ searchParams }: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { error, status } = await searchParams;
  if (status === "success" && !error) {
    return (
      <AuthShell title="비밀번호를 변경했어요" description="새 비밀번호로 로그인해 주세요.">
        <Link className="flex min-h-13 items-center justify-center rounded-full bg-primary px-4 font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20" href="/login">로그인하기</Link>
      </AuthShell>
    );
  }
  let email: string | undefined;
  let userId: string | undefined;
  if (!error) {
    try {
      const supabase = await createRecoveryClient({ readOnly: true });
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!authError && user?.email) {
        email = user.email;
        userId = user.id;
      }
    } catch {
      console.error("Recovery session lookup unavailable");
    }
  }
  return (
    <AuthShell title={email ? "새 비밀번호를 정해 주세요" : "복구 링크를 확인해 주세요"}
      description={email ? "다른 곳에서 사용하지 않는 비밀번호로 설정해 주세요." : "링크가 만료됐거나 유효하지 않아요. 복구 메일을 다시 요청해 주세요."}>
      {email && userId ? <ResetPasswordForm email={email} userId={userId} /> : (
        <Link className="flex min-h-13 items-center justify-center rounded-full bg-primary px-4 font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20" href="/forgot-password">복구 메일 다시 요청하기</Link>
      )}
    </AuthShell>
  );
}
