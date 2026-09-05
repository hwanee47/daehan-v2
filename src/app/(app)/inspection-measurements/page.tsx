import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { WorkspaceBreadcrumb } from "@/components/layout/workspace-breadcrumb";
import { createClient } from "@/lib/supabase/server";

import { getInspectionReportData } from "../inspection-reports/data";
import { getRecentWorkedReports } from "./actions";
import { InspectionMeasurementSheet } from "./inspection-measurement-sheet";

export const metadata: Metadata = { title: "결과 입력 | Daehan", description: "검사성적서의 측정결과를 입력해요." };

export default async function InspectionMeasurementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [data, recentWorked] = await Promise.all([getInspectionReportData(), getRecentWorkedReports()]);
  return <main className="@container/workspace flex h-full min-h-0 flex-col overflow-hidden bg-background"><Container className="flex h-full min-h-0 flex-col py-5 @min-[640px]/workspace:py-6" size="full"><WorkspaceBreadcrumb current="결과 입력" parent="검사성적서" /><section className="min-h-0 flex-1"><InspectionMeasurementSheet data={data} fillContainer initialRecentWorked={recentWorked} showModeTabs={false} /></section></Container></main>;
}
