"use server";

import { createClient } from "@/lib/supabase/server";
import { itemImageBucket } from "@/lib/item-images";
import { createSignedFileUrls } from "@/lib/supabase/storage";

import type { InspectionMeasurementRunItem, InspectionReport } from "../inspection-reports/types";

const reportColumns = "seq, model_name, item_seq, item_code, item_name, item_detail_seq, item_detail_code, item_detail_name, material, image_path, customer_name, supplier_name, delivery_quantity, sample_count, delivery_date, delivery_quantity_text, sample_count_text, delivery_date_text, product_type_code_seq, product_type_code, product_type_name, hardness, heat_treatment, final_judgment_code_seq";

export type RecentMeasurementRun = {
  seq: number;
  runNo: number;
  eventType: "save" | "print" | "migration";
  createdAt: string;
  items: InspectionMeasurementRunItem[];
};

export type RecentMeasurementHistoryResult = {
  runs: RecentMeasurementRun[];
  error: string | null;
};

export type RecentWorkedReport = InspectionReport & {
  lastWorkedAt: string;
};

export type RecentWorkedReportsResult = {
  rows: RecentWorkedReport[];
  error: string | null;
};

const runItemColumns = "seq, measurement_run_seq, source_report_item_seq, sort_order, nominal_dimension, tolerance_min, tolerance_max, marker_x_ratio, marker_y_ratio, result_1, result_2, result_3, result_4, result_5, result_6, result_7, result_8, result_9, result_10, note";

export async function getRecentWorkedReports(): Promise<RecentWorkedReportsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { rows: [], error: "로그인이 필요해요." };

  const latestByReport = new Map<number, string>();
  const batchSize = 50;
  for (let page = 0; page < 20 && latestByReport.size < 5; page += 1) {
    const from = page * batchSize;
    const { data: runs, error: runsError } = await supabase
      .from("inspection_measurement_runs")
      .select("inspection_report_seq, created_at")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .order("seq", { ascending: false })
      .range(from, from + batchSize - 1);
    if (runsError) {
      console.error("Failed to load recent worked report runs", { code: runsError.code });
      return { rows: [], error: "최근 작업 성적서를 불러오지 못했어요." };
    }
    for (const run of runs ?? []) {
      if (!latestByReport.has(run.inspection_report_seq)) latestByReport.set(run.inspection_report_seq, run.created_at);
      if (latestByReport.size >= 5) break;
    }
    if ((runs?.length ?? 0) < batchSize) break;
  }

  const reportSeqs = [...latestByReport.keys()];
  if (reportSeqs.length === 0) return { rows: [], error: null };
  const { data: reports, error: reportsError } = await supabase
    .from("inspection_reports")
    .select(reportColumns)
    .in("seq", reportSeqs)
    .eq("is_deleted", false);
  if (reportsError) {
    console.error("Failed to load recent worked reports", { code: reportsError.code });
    return { rows: [], error: "최근 작업 성적서를 불러오지 못했어요." };
  }

  const reportRows = (reports ?? []) as Omit<InspectionReport, "image_url">[];
  let signedUrls = new Map<string, string>();
  try {
    signedUrls = await createSignedFileUrls(supabase, itemImageBucket, reportRows.map((report) => report.image_path));
  } catch (signError) {
    console.error("Failed to sign recent worked report image URLs", { message: signError instanceof Error ? signError.message : "Unknown storage error" });
  }
  const reportsBySeq = new Map(reportRows.map((report) => [report.seq, report]));
  return {
    rows: reportSeqs.flatMap((seq) => {
      const report = reportsBySeq.get(seq);
      return report ? [{ ...report, image_url: report.image_path ? signedUrls.get(report.image_path) ?? null : null, lastWorkedAt: latestByReport.get(seq)! }] : [];
    }),
    error: null,
  };
}

export async function searchMeasurementReports(keywordValue: string): Promise<{ rows: InspectionReport[]; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { rows: [], error: "로그인이 필요해요." };

  const keyword = keywordValue.trim().slice(0, 100);
  let request = supabase.from("inspection_reports").select(reportColumns).eq("is_deleted", false);
  if (keyword) {
    const escapedKeyword = keyword.replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(",", " ");
    request = request.or(["model_name", "item_detail_code", "item_detail_name", "customer_name"].map((column) => `${column}.ilike.%${escapedKeyword}%`).join(","));
  }
  const { data, error } = await request.order("created_at", { ascending: false }).order("seq", { ascending: false });
  if (error) {
    console.error("Failed to search reports for measurement input", { code: error.code });
    return { rows: [], error: "검사성적서를 조회하지 못했어요." };
  }
  return { rows: (data ?? []).map((report) => ({ ...report, image_url: null })) as InspectionReport[], error: null };
}

export async function getRecentMeasurementHistory(inspectionReportSeq: number): Promise<RecentMeasurementHistoryResult> {
  if (!Number.isSafeInteger(inspectionReportSeq) || inspectionReportSeq <= 0) return { runs: [], error: "조회할 검사성적서를 확인해 주세요." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { runs: [], error: "로그인이 필요해요." };

  const { data: report, error: reportError } = await supabase.from("inspection_reports").select("seq").eq("seq", inspectionReportSeq).eq("is_deleted", false).maybeSingle();
  if (reportError || !report) {
    console.error("Failed to verify report for recent measurement history", { code: reportError?.code });
    return { runs: [], error: "검사성적서를 확인하지 못했어요." };
  }

  const { data: runs, error: runsError } = await supabase
    .from("inspection_measurement_runs")
    .select("seq, run_no, event_type, created_at")
    .eq("inspection_report_seq", inspectionReportSeq)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .order("seq", { ascending: false })
    .limit(5);
  if (runsError) {
    console.error("Failed to load recent measurement history", { code: runsError.code });
    return { runs: [], error: "최근 측정이력을 불러오지 못했어요." };
  }
  if (!runs?.length) return { runs: [], error: null };

  const { data: items, error: itemsError } = await supabase
    .from("inspection_measurement_run_items")
    .select(runItemColumns)
    .in("measurement_run_seq", runs.map((run) => run.seq))
    .order("sort_order");
  if (itemsError) {
    console.error("Failed to load recent measurement history items", { code: itemsError.code });
    return { runs: [], error: "최근 측정이력의 상세 결과를 불러오지 못했어요." };
  }

  const historyItems = (items ?? []) as InspectionMeasurementRunItem[];
  return {
    runs: runs.map((run) => ({
      seq: run.seq,
      runNo: run.run_no,
      eventType: run.event_type,
      createdAt: run.created_at,
      items: historyItems.filter((item) => item.measurement_run_seq === run.seq),
    })),
    error: null,
  };
}
