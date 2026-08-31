"use server";

import { itemImageBucket } from "@/lib/item-images";
import { createClient } from "@/lib/supabase/server";
import { createSignedFileUrls } from "@/lib/supabase/storage";

import type { InspectionMeasurementRun, InspectionMeasurementRunItem } from "../inspection-reports/types";
import type { MeasurementHistoryDetail, MeasurementHistoryPage, MeasurementHistoryQuery, MeasurementItemGroup, MeasurementItemGroupPage } from "./types";

const pageSize = 50;
const searchColumns = { model: "model_name", drawing: "item_detail_code", itemName: "item_name", customer: "customer_name" } as const;
const runColumns = "seq, inspection_report_seq, run_no, event_type, model_name, item_seq, item_code, item_detail_seq, item_detail_code, item_detail_name, item_name, customer_name, supplier_name, delivery_quantity, sample_count, product_type_code_seq, product_type_code, product_type_name, material, hardness, heat_treatment, image_path, created_at";
const runItemColumns = "seq, measurement_run_seq, source_report_item_seq, sort_order, nominal_dimension, tolerance_min, tolerance_max, marker_x_ratio, marker_y_ratio, result_1, result_2, result_3, result_4, result_5, result_6, result_7, result_8, result_9, result_10, note";

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dayBoundary(value: string, nextDay = false) {
  const date = new Date(`${value}T00:00:00+09:00`);
  if (nextDay) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

export async function searchMeasurementHistory(query: MeasurementHistoryQuery): Promise<MeasurementHistoryPage> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const page = Number.isInteger(query.page) && query.page > 0 && query.page <= 1_000_000 ? query.page : 1;
  if (!user) return { rows: [], total: 0, page, pageSize, error: "로그인이 필요해요." };

  let request = supabase.from("inspection_measurement_runs").select(runColumns, { count: "exact" });
  if (validDate(query.dateFrom)) request = request.gte("created_at", dayBoundary(query.dateFrom));
  if (validDate(query.dateTo)) request = request.lt("created_at", dayBoundary(query.dateTo, true));

  const keyword = query.keyword.trim().slice(0, 100);
  const column = Object.hasOwn(searchColumns, query.searchField) ? searchColumns[query.searchField as keyof typeof searchColumns] : null;
  if (column && keyword) request = request.ilike(column, `%${keyword}%`);

  const from = (page - 1) * pageSize;
  const { data, error, count } = await request.order("created_at", { ascending: false }).order("seq", { ascending: false }).range(from, from + pageSize - 1);
  if (error) {
    console.error("Failed to search measurement history", { code: error.code });
    return { rows: [], total: 0, page, pageSize, error: "측정 이력을 조회하지 못했어요." };
  }

  return {
    rows: ((data ?? []) as unknown as Omit<InspectionMeasurementRun, "image_url">[]).map((run) => ({ ...run, image_url: null })),
    total: count ?? 0,
    page,
    pageSize,
    error: null,
  };
}

export async function searchMeasurementItemGroups(query: MeasurementHistoryQuery): Promise<MeasurementItemGroupPage> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const page = Number.isInteger(query.page) && query.page > 0 && query.page <= 1_000_000 ? query.page : 1;
  if (!user) return { rows: [], total: 0, page, pageSize, error: "로그인이 필요해요." };

  const keyword = query.keyword.trim().slice(0, 100);
  const from = (page - 1) * pageSize;
  const { data, error } = await supabase.rpc("search_inspection_measurement_item_groups", {
    p_date_from: validDate(query.dateFrom) ? dayBoundary(query.dateFrom) : null,
    p_date_to: validDate(query.dateTo) ? dayBoundary(query.dateTo, true) : null,
    p_search_field: query.searchField,
    p_keyword: keyword,
    p_offset: from,
    p_limit: pageSize,
  });
  if (error) {
    console.error("Failed to search measurement item groups", { code: error.code });
    return { rows: [], total: 0, page, pageSize, error: "품목별 측정 이력을 조회하지 못했어요." };
  }
  const rawRows = (data ?? []) as Array<MeasurementItemGroup & { total_count: number }>;
  return {
    rows: rawRows.map((row) => ({
      item_seq: row.item_seq,
      item_code: row.item_code,
      item_name: row.item_name,
      model_name: row.model_name,
      item_detail_count: Number(row.item_detail_count),
      run_count: Number(row.run_count),
      latest_created_at: row.latest_created_at,
    })),
    total: Number(rawRows[0]?.total_count ?? 0),
    page,
    pageSize,
    error: null,
  };
}

export async function searchMeasurementItemRuns(itemSeq: number, page: number): Promise<MeasurementHistoryPage> {
  const safePage = Number.isInteger(page) && page > 0 && page <= 1_000_000 ? page : 1;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !Number.isSafeInteger(itemSeq) || itemSeq <= 0) return { rows: [], total: 0, page: safePage, pageSize, error: "조회할 품목을 확인해 주세요." };
  const from = (safePage - 1) * pageSize;
  const { data, error, count } = await supabase.from("inspection_measurement_runs").select(runColumns, { count: "exact" }).eq("item_seq", itemSeq).order("item_detail_code").order("created_at", { ascending: false }).order("seq", { ascending: false }).range(from, from + pageSize - 1);
  if (error) {
    console.error("Failed to search item measurement runs", { code: error.code });
    return { rows: [], total: 0, page: safePage, pageSize, error: "품목의 검사서를 조회하지 못했어요." };
  }
  return { rows: ((data ?? []) as unknown as Omit<InspectionMeasurementRun, "image_url">[]).map((run) => ({ ...run, image_url: null })), total: count ?? 0, page: safePage, pageSize, error: null };
}

export async function getMeasurementHistoryDetail(runSeq: number): Promise<MeasurementHistoryDetail> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !Number.isInteger(runSeq) || runSeq <= 0) return { run: null, items: [], error: "조회할 이력을 확인해 주세요." };

  const [runResult, itemsResult] = await Promise.all([
    supabase.from("inspection_measurement_runs").select(runColumns).eq("seq", runSeq).maybeSingle(),
    supabase.from("inspection_measurement_run_items").select(runItemColumns).eq("measurement_run_seq", runSeq).order("sort_order"),
  ]);
  if (runResult.error || itemsResult.error || !runResult.data) {
    console.error("Failed to load measurement history detail", { codes: [runResult.error?.code, itemsResult.error?.code].filter(Boolean) });
    return { run: null, items: [], error: "성적서 이력을 불러오지 못했어요." };
  }

  const rawRun = runResult.data as unknown as Omit<InspectionMeasurementRun, "image_url">;
  let imageUrl: string | null = null;
  if (rawRun.image_path) {
    try {
      imageUrl = (await createSignedFileUrls(supabase, itemImageBucket, [rawRun.image_path])).get(rawRun.image_path) ?? null;
    } catch (error) {
      console.error("Failed to sign history image", { message: error instanceof Error ? error.message : "Unknown storage error" });
    }
  }
  return { run: { ...rawRun, image_url: imageUrl }, items: (itemsResult.data ?? []) as InspectionMeasurementRunItem[], error: null };
}
