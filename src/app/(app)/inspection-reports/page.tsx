import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { WorkspaceBreadcrumb } from "@/components/layout/workspace-breadcrumb";
import { createClient } from "@/lib/supabase/server";

import { getInspectionReportData } from "./data";
import { InspectionReportManagement } from "./inspection-report-management";

export const metadata: Metadata = {
  title: "성적서 관리 | Daehan",
  description: "검사성적서 기본정보와 검사항목을 관리해요.",
};

export default async function InspectionReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const data = await getInspectionReportData();

  return (
    <main className="@container/workspace min-h-svh bg-background">
      <Container className="py-5 @min-[640px]/workspace:py-6" size="full">
        <WorkspaceBreadcrumb current="성적서 관리" parent="검사성적서" />
        <section>
          <InspectionReportManagement data={data} />
        </section>
      </Container>
    </main>
  );
}
