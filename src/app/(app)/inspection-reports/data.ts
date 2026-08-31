import "server-only";

import { itemImageBucket } from "@/lib/item-images";
import { createClient } from "@/lib/supabase/server";
import { createSignedFileUrls } from "@/lib/supabase/storage";

import type {
  InspectionCodeOption,
  InspectionItemOption,
  InspectionReport,
  InspectionReportData,
  InspectionReportItem,
  InspectionReportMeasurement,
} from "./types";

export async function getInspectionReportData(): Promise<InspectionReportData> {
  const supabase = await createClient();
  const [reportsResult, itemsResult, measurementsResult, detailsResult, codesResult] =
    await Promise.all([
      supabase.from("inspection_reports").select("seq, model_name, item_seq, item_code, item_name, item_detail_seq, item_detail_code, item_detail_name, material, image_path, customer_name, supplier_name, delivery_quantity, sample_count, product_type_code_seq, product_type_code, product_type_name, hardness, heat_treatment, final_judgment_code_seq").order("created_at", { ascending: false }).order("seq", { ascending: false }),
      supabase.from("inspection_report_items").select("seq, sort_order, inspection_report_seq, nominal_dimension, tolerance_min, tolerance_max, marker_x_ratio, marker_y_ratio").order("inspection_report_seq").order("sort_order"),
      supabase.from("inspection_report_measurements").select("seq, inspection_report_seq, inspection_report_item_seq, result_1, result_2, result_3, result_4, result_5, result_6, result_7, result_8, result_9, result_10, note").order("inspection_report_seq").order("inspection_report_item_seq"),
      supabase.from("item_details").select("seq, item_detail_code, item_detail_name, material, image_path, items!inner(item_name, model_name)").order("item_detail_code"),
      supabase.from("code_details").select("seq, code, code_name, code_groups!inner(group_code)").eq("is_active", true).in("code_groups.group_code", ["U0001", "U0002", "U0003", "FINAL_JUDGMENT_STATUS"]).order("sort_order").order("seq"),
    ]);

  const errors = [reportsResult.error, itemsResult.error, measurementsResult.error, detailsResult.error, codesResult.error].filter(Boolean);
  if (errors.length) console.error("Failed to load inspection reports", { codes: errors.map((error) => error?.code) });

  const detailRows = (detailsResult.data ?? []) as unknown as Array<{
    seq: number; item_detail_code: string; item_detail_name: string; material: string | null; image_path: string | null;
    items: { item_name: string; model_name: string | null };
  }>;
  let signedUrls = new Map<string, string>();
  try {
    signedUrls = await createSignedFileUrls(supabase, itemImageBucket, [...detailRows.map((detail) => detail.image_path), ...(reportsResult.data ?? []).map((report) => report.image_path)]);
  } catch (error) {
    console.error("Failed to create inspection item image URLs", { message: error instanceof Error ? error.message : "Unknown storage error" });
  }

  return {
    reports: (reportsResult.data ?? []).map((report) => ({ ...report, image_url: report.image_path ? signedUrls.get(report.image_path) ?? null : null })) as InspectionReport[],
    items: (itemsResult.data ?? []) as InspectionReportItem[],
    measurements: (measurementsResult.data ?? []) as InspectionReportMeasurement[],
    measurementRuns: [],
    measurementRunItems: [],
    itemOptions: detailRows.map((detail): InspectionItemOption => ({
      seq: detail.seq,
      item_detail_code: detail.item_detail_code,
      item_detail_name: detail.item_detail_name,
      material: detail.material,
      image_url: detail.image_path ? (signedUrls.get(detail.image_path) ?? null) : null,
      item_name: detail.items.item_name,
      model_name: detail.items.model_name,
    })),
    codes: ((codesResult.data ?? []) as unknown as Array<{ seq: number; code: string; code_name: string; code_groups: { group_code: string } }>).map((code) => ({
      seq: code.seq,
      code: code.code,
      code_name: code.code_name,
      group_code: code.code_groups.group_code,
    })) as InspectionCodeOption[],
    hasError: errors.length > 0,
  };
}
