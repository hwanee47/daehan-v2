import "server-only";

import { createClient } from "@/lib/supabase/server";

export type HomeDashboardData = {
  todayLabel: string;
  counts: { reports: number; withoutMeasurementHistory: number; savedToday: number; printedToday: number };
  checks: { itemDetailsWithoutImage: number; itemsWithoutTolerance: number; reportsWithoutItems: number };
  pendingReports: Array<{ seq: number; modelName: string; itemDetailCode: string; customerName: string | null }>;
  recentRuns: Array<{ seq: number; eventType: "save" | "print"; modelName: string; itemDetailCode: string; itemName: string | null; customerName: string | null; createdAt: string }>;
  canManageMasters: boolean;
  hasError: boolean;
};

function seoulDayBounds() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const start = new Date(`${values.year}-${values.month}-${values.day}T00:00:00+09:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const label = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "full" }).format(start);
  return { start: start.toISOString(), end: end.toISOString(), label };
}

export async function getHomeDashboardData(): Promise<HomeDashboardData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { start, end, label } = seoulDayBounds();
  const [profileResult, reportsResult, runReportsResult, recentRunsResult, savedTodayResult, printedTodayResult, itemsResult, detailsResult, rangesResult, reportItemsResult] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("inspection_reports").select("seq, model_name, item_detail_code, customer_name, created_at").order("created_at", { ascending: false }).order("seq", { ascending: false }),
    supabase.from("inspection_measurement_runs").select("inspection_report_seq").in("event_type", ["save", "print"]),
    supabase.from("inspection_measurement_runs").select("seq, event_type, model_name, item_detail_code, item_name, customer_name, created_at").in("event_type", ["save", "print"]).order("created_at", { ascending: false }).order("seq", { ascending: false }).limit(8),
    supabase.from("inspection_measurement_runs").select("seq", { count: "exact", head: true }).eq("event_type", "save").gte("created_at", start).lt("created_at", end),
    supabase.from("inspection_measurement_runs").select("seq", { count: "exact", head: true }).eq("event_type", "print").gte("created_at", start).lt("created_at", end),
    supabase.from("items").select("seq"),
    supabase.from("item_details").select("seq, item_seq, image_path"),
    supabase.from("item_tolerance_ranges").select("item_seq"),
    supabase.from("inspection_report_items").select("inspection_report_seq"),
  ]);
  const errors = [profileResult.error, reportsResult.error, runReportsResult.error, recentRunsResult.error, savedTodayResult.error, printedTodayResult.error, itemsResult.error, detailsResult.error, rangesResult.error, reportItemsResult.error].filter(Boolean);
  if (errors.length) console.error("Failed to load home dashboard", { codes: errors.map((error) => error?.code) });

  const measuredReportSeqs = new Set((runReportsResult.data ?? []).map((run) => run.inspection_report_seq));
  const pendingReports = (reportsResult.data ?? []).filter((report) => !measuredReportSeqs.has(report.seq));
  const itemSeqsWithTolerance = new Set((rangesResult.data ?? []).map((range) => range.item_seq));
  const reportSeqsWithItems = new Set((reportItemsResult.data ?? []).map((item) => item.inspection_report_seq));

  return {
    todayLabel: label,
    counts: { reports: reportsResult.data?.length ?? 0, withoutMeasurementHistory: pendingReports.length, savedToday: savedTodayResult.count ?? 0, printedToday: printedTodayResult.count ?? 0 },
    checks: {
      itemDetailsWithoutImage: (detailsResult.data ?? []).filter((detail) => !detail.image_path?.trim()).length,
      itemsWithoutTolerance: (itemsResult.data ?? []).filter((item) => !itemSeqsWithTolerance.has(item.seq)).length,
      reportsWithoutItems: (reportsResult.data ?? []).filter((report) => !reportSeqsWithItems.has(report.seq)).length,
    },
    pendingReports: pendingReports.slice(0, 6).map((report) => ({ seq: report.seq, modelName: report.model_name, itemDetailCode: report.item_detail_code, customerName: report.customer_name })),
    recentRuns: (recentRunsResult.data ?? []).map((run) => ({ seq: run.seq, eventType: run.event_type as "save" | "print", modelName: run.model_name, itemDetailCode: run.item_detail_code, itemName: run.item_name, customerName: run.customer_name, createdAt: run.created_at })),
    canManageMasters: profileResult.data?.role === "admin",
    hasError: errors.length > 0,
  };
}
