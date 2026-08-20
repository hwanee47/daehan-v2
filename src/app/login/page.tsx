import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { createClient } from "@/lib/supabase/server";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "로그인 | Daehan",
  description: "Daehan 계정으로 로그인해요.",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-svh items-center py-10 sm:py-16">
      <Container className="flex justify-center">
        <section className="w-full max-w-md" aria-labelledby="login-title">
          <Link className="inline-flex min-h-11 items-center font-semibold tracking-tight" href="/">
            DAEHAN
          </Link>

          <div className="mb-8 mt-8 sm:mb-10 sm:mt-12">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" id="login-title">
              다시 만나서 반가워요
            </h1>
            <p className="mt-3 break-keep text-base text-muted-foreground">
              가입한 이메일과 비밀번호로 로그인해 주세요.
            </p>
          </div>

          <LoginForm />

          <p className="mt-8 text-center text-sm text-muted-foreground">
            아직 계정이 없나요?{" "}
            <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/signup">
              회원가입
            </Link>
          </p>
        </section>
      </Container>
    </main>
  );
}
