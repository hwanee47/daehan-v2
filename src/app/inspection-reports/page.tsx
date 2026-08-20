import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "검사성적서 | Daehan",
  description: "검사성적서를 관리해요.",
};

export default function InspectionReportsPage() {
  return (
    <main className="min-h-svh py-10 sm:py-16">
      <Container size="lg">
        <Link className="inline-flex min-h-11 items-center font-semibold text-primary" href="/">
          홈으로 돌아가기
        </Link>
        <section className="mt-10" aria-labelledby="inspection-reports-title">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" id="inspection-reports-title">
            검사성적서
          </h1>
          <p className="mt-3 text-muted-foreground">검사성적서 관리 기능을 준비하고 있어요.</p>
        </section>
      </Container>
    </main>
  );
}

