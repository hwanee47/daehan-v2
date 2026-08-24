import { UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ReferenceInformationMenu } from "@/app/reference-information-menu";
import { homeContent } from "@/content/home";
import { createClient } from "@/lib/supabase/server";

import { Container } from "./container";

async function getCurrentUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, isAuthenticated: false, name: null };
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load user profile for app header", {
      code: error.code,
    });
  }

  return {
    isAdmin: profile?.role === "admin",
    isAuthenticated: true,
    name:
      profile?.name ||
      (typeof user.user_metadata.name === "string" ? user.user_metadata.name : null) ||
      user.email?.split("@")[0] ||
      "사용자",
  };
}

export async function AppHeader() {
  const { isAdmin, isAuthenticated, name: userName } = await getCurrentUserProfile();

  return (
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

        {isAuthenticated ? (
          <nav aria-label="주요 메뉴" className="flex items-center justify-self-center">
            <Link className="flex h-11 items-center rounded-xl px-3 font-semibold text-foreground transition-colors hover:bg-muted sm:px-5" href="/inspection-reports">
              검사성적서
            </Link>
            {isAdmin ? <ReferenceInformationMenu /> : null}
          </nav>
        ) : null}

        <nav aria-label="사용자 메뉴" className="col-start-3 flex justify-self-end text-muted-foreground">
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
  );
}
