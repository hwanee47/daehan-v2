import { CalendarDays, Mail, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { createClient } from "@/lib/supabase/server";

import { LogoutForm } from "./logout-form";

export const metadata: Metadata = {
  title: "내 프로필 | Daehan",
  description: "Daehan 계정 정보를 확인해요.",
};

const joinedAtFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("name, email, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile page", { code: error.code });
  }

  return (
    <main className="min-h-svh bg-background py-10 sm:py-16">
      <Container size="sm">
        <Link
          className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline"
          href="/"
        >
          홈으로 돌아가기
        </Link>

        <section className="mt-8 sm:mt-12" aria-labelledby="profile-title">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary sm:size-16">
              <UserRound className="size-7 sm:size-8" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">내 계정</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl" id="profile-title">
                내 프로필
              </h1>
            </div>
          </div>
          <p className="mt-5 break-keep text-muted-foreground">
            Daehan에서 사용 중인 계정 정보를 확인할 수 있어요.
          </p>

          {profile && !error ? (
            <dl className="mt-10 divide-y divide-border rounded-[28px] border border-border bg-card px-5 sm:px-8">
              <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr] sm:items-center">
                <dt className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <UserRound className="size-5" aria-hidden="true" />
                  이름
                </dt>
                <dd className="min-w-0 break-words font-semibold text-foreground">{profile.name}</dd>
              </div>
              <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr] sm:items-center">
                <dt className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Mail className="size-5" aria-hidden="true" />
                  이메일
                </dt>
                <dd className="min-w-0 break-all text-foreground">{profile.email}</dd>
              </div>
              <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr] sm:items-center">
                <dt className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <CalendarDays className="size-5" aria-hidden="true" />
                  가입일
                </dt>
                <dd className="text-foreground">{joinedAtFormatter.format(new Date(profile.created_at))}</dd>
              </div>
            </dl>
          ) : (
            <div className="mt-10 rounded-[28px] border border-border bg-card p-6 sm:p-8" role="status">
              <h2 className="text-lg font-semibold">프로필을 불러오지 못했어요</h2>
              <p className="mt-2 break-keep text-muted-foreground">
                잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.
              </p>
              <Link className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href="/profile">
                다시 시도하기
              </Link>
            </div>
          )}

          <LogoutForm />
        </section>
      </Container>
    </main>
  );
}
