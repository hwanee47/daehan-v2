import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "회원가입 | Daehan",
  description: "Daehan 계정을 만들어요.",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-svh items-center py-10 sm:py-16">
      <Container className="flex justify-center">
        <section className="w-full max-w-md" aria-labelledby="signup-title">
          <Link className="inline-flex min-h-11 items-center font-semibold tracking-tight" href="/">
            Daehan
          </Link>

          <div className="mb-8 mt-8 sm:mb-10 sm:mt-12">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" id="signup-title">
              계정을 만들어 볼까요?
            </h1>
            <p className="mt-3 break-keep text-base text-muted-foreground">
              이름과 이메일을 입력하면 바로 시작할 수 있어요.
            </p>
          </div>

          <SignupForm />

          <p className="mt-8 text-center text-sm text-muted-foreground">
            이미 계정이 있나요?{" "}
            <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/login">
              로그인
            </Link>
          </p>
        </section>
      </Container>
    </main>
  );
}
