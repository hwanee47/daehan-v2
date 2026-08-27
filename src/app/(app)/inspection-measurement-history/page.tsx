import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { WorkspaceBreadcrumb } from "@/components/layout/workspace-breadcrumb";
import { createClient } from "@/lib/supabase/server";

import { getInspectionReportData } from "../inspection-reports/data";
import { searchMeasurementHistory } from "./actions";
import { InspectionMeasurementHistory } from "./inspection-measurement-history";

export const metadata: Metadata = { title: "측정 이력 | Daehan", description: "검사성적서의 측정 회차를 조회하고 재인쇄해요." };

export default async function InspectionMeasurementHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const data = await getInspectionReportData();
  const initialHistory = await searchMeasurementHistory({ dateFrom: "", dateTo: "", searchField: "", keyword: "", page: 1 });
  return <main className="@container/workspace min-h-svh bg-background"><Container className="py-5 @min-[640px]/workspace:py-6" size="full"><WorkspaceBreadcrumb current="측정 이력" parent="검사성적서" /><section><InspectionMeasurementHistory data={data} initialHistory={initialHistory} /></section></Container></main>;
}
