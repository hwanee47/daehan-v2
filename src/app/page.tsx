import { Check, Circle, LockKeyhole, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { homeContent } from "@/content/home";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { ReferenceInformationMenu } from "./reference-information-menu";

async function getCurrentUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, name: null };
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load user profile", {
      code: error.code,
    });
  }

  return {
    isAdmin: profile?.role === "admin",
    name:
      profile?.name ||
      (typeof user.user_metadata.name === "string" ? user.user_metadata.name : null) ||
      user.email?.split("@")[0] ||
      "사용자",
  };
}

export default async function Home() {
  const { isAdmin, name: userName } = await getCurrentUserProfile();

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <Container className="grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-2 lg:h-[88px]" size="full">
          <Link aria-label="Daehan 홈" className="flex w-fit items-center gap-3 text-xl font-bold tracking-tight" href="/">
            <Image
              alt=""
              className="size-9 object-contain"
              height={36}
              priority
              src="/brand/daehan-mark.png"
              width={36}
            />
            <span className="hidden sm:inline">{homeContent.brand}</span>
          </Link>

          <nav aria-label="주요 메뉴" className="flex items-center justify-self-center">
            <Link className="flex h-11 items-center rounded-xl px-3 font-semibold text-foreground transition-colors hover:bg-muted sm:px-5" href="/inspection-reports">
              검사성적서
            </Link>
            {isAdmin ? <ReferenceInformationMenu /> : null}
          </nav>

          <nav aria-label="사용자 메뉴" className="flex justify-self-end text-muted-foreground">
            {userName ? (
              <Link aria-label={`${userName}님의 프로필 보기`} className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-2 font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-3" href="/profile">
                <UserRound className="size-6" aria-hidden="true" />
                <span className="hidden max-w-40 truncate sm:inline">{userName}님</span>
              </Link>
            ) : (
              <Link aria-label="로그인" className="flex h-11 items-center gap-2 rounded-xl px-2 font-medium transition-colors hover:bg-muted sm:px-3" href="/login">
                <UserRound className="size-6" aria-hidden="true" />
                <span className="hidden sm:inline">로그인</span>
              </Link>
            )}
          </nav>
        </Container>
      </header>

      <Container className="grid min-h-[calc(100vh-5rem)] items-center gap-16 py-16 lg:min-h-[calc(100vh-88px)] lg:max-w-[1312px] lg:-translate-y-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-24" size="xl">
        <section className="max-w-xl">
          <h1 className="whitespace-pre-line text-[42px] leading-[1.16] font-bold tracking-[-0.035em] text-foreground sm:text-[56px] lg:text-[64px]">
            {homeContent.headline}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl lg:text-[22px] lg:leading-10">
            {homeContent.description}
          </p>
          <a className={cn(buttonVariants({ size: "lg" }), "mt-10 w-full rounded-full sm:w-[480px] lg:h-20 lg:text-lg")} href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
            {homeContent.primaryAction}
          </a>
        </section>

        <section aria-labelledby="setup-title" className="w-full justify-self-end">
          <div className="rounded-[28px] bg-muted p-5 sm:p-10">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 id="setup-title" className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
                {homeContent.panelTitle}
              </h2>
              <span className="text-tabular text-sm font-semibold text-primary">1 / 3</span>
            </div>
            <div aria-label="설정 진행률 33%" aria-valuemax={3} aria-valuemin={0} aria-valuenow={1} className="mb-10 h-2 overflow-hidden rounded-full bg-border" role="progressbar">
              <div className="h-full w-1/3 rounded-full bg-primary" />
            </div>

            <div className="space-y-4">
              {homeContent.setupItems.map(({ icon: Icon, ready, status, title }) => (
                <div className="flex min-h-28 items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 sm:min-h-32 sm:gap-6 sm:px-7" key={title}>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Icon className="size-6" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold sm:text-xl">{title}</h3>
                    <span className={cn("mt-1.5 flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold sm:hidden", ready ? "bg-accent text-primary" : "bg-secondary text-muted-foreground")}>
                      {ready ? <Check className="size-3.5" /> : <Circle className="size-2.5" />}
                      {status}
                    </span>
                  </div>
                  <span className={cn("hidden shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold sm:flex", ready ? "bg-accent text-primary" : "bg-secondary text-muted-foreground")}>
                    {ready ? <Check className="size-4" /> : <Circle className="size-3" />}
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-7 flex items-center justify-center gap-2 text-sm text-muted-foreground sm:text-base">
            <LockKeyhole className="size-5 shrink-0" />
            {homeContent.securityNote}
          </p>
        </section>
      </Container>
    </main>
  );
}
