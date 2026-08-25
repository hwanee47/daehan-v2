import type { Metadata } from "next";
import { Container } from "@/components/layout/container";

import { InspectionReportsGrid } from "./inspection-reports-grid";

export const metadata: Metadata = {
  title: "검사성적서 | Daehan",
  description: "검사성적서를 관리해요.",
};

export default function InspectionReportsPage() {
  return (
    <main className="@container/workspace min-h-svh">
      <Container className="py-10 @min-[640px]/workspace:py-16" size="lg">
        <section aria-labelledby="inspection-reports-title">
          <h1 className="text-3xl font-semibold tracking-tight @min-[640px]/workspace:text-4xl" id="inspection-reports-title">
            검사성적서
          </h1>
          <p className="mt-3 text-muted-foreground">
            등록된 검사성적서를 확인하고 열 제목을 선택해 정렬할 수 있어요.
          </p>
          <div className="mt-8">
            <InspectionReportsGrid />
          </div>
        </section>
      </Container>
    </main>
  );
}
