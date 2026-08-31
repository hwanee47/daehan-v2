"use server";

import { createClient } from "@/lib/supabase/server";

import { searchMeasurementHistory } from "./inspection-measurement-history/actions";
import { searchInspectionReports } from "./inspection-reports/actions";
import { getInspectionReportData } from "./inspection-reports/data";
import type { MeasurementHistoryPage } from "./inspection-measurement-history/types";
import type { InspectionReportData, InspectionReportPage } from "./inspection-reports/types";
import { attachItemImageUrls } from "./master/items/item-image-urls";
import type { Item, ItemDetail } from "./master/items/types";
import type { CodeDetail, CodeGroup } from "./master/codes/types";
import type { ItemToleranceRange, ToleranceItem } from "./master/tolerance-ranges/types";

export type WorkspaceSearchFilters = {
  itemCode: string;
  itemDetailCode: string;
  itemName: string;
  modelName: string;
};

export type ItemsWorkspaceResult = {
  items: Item[];
  details: ItemDetail[];
  error: string | null;
};

export type ToleranceWorkspaceResult = {
  items: ToleranceItem[];
  ranges: ItemToleranceRange[];
  error: string | null;
};

export type CodesWorkspaceResult = {
  groups: CodeGroup[];
  details: CodeDetail[];
  error: string | null;
};

export type InspectionReportsWorkspaceResult = {
  data: InspectionReportData;
  page: InspectionReportPage;
};

export type InspectionHistoryWorkspaceResult = {
  data: InspectionReportData;
  history: MeasurementHistoryPage;
};

const emptyInspectionData: InspectionReportData = {
  reports: [],
  items: [],
  measurements: [],
  measurementRuns: [],
  measurementRunItems: [],
  itemOptions: [],
  codes: [],
  hasError: true,
};

function cleanFilter(value: string) {
  return value.trim().slice(0, 100);
}

function escapeLikePattern(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

async function getAuthorizedClient(adminOnly = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, error: "로그인이 필요해요." };
  if (!adminOnly) return { supabase, error: null };

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || profile?.role !== "admin") {
    return { supabase: null, error: "관리자 권한이 필요해요." };
  }
  return { supabase, error: null };
}

export async function loadInspectionReportsWorkspace(): Promise<InspectionReportsWorkspaceResult> {
  const authorization = await getAuthorizedClient();
  if (!authorization.supabase) {
    return {
      data: emptyInspectionData,
      page: { rows: [], total: 0, page: 1, pageSize: 50, error: authorization.error },
    };
  }
  const [data, page] = await Promise.all([
    getInspectionReportData(),
    searchInspectionReports({ searchField: "all", keyword: "", sortOrder: "newest", page: 1 }),
  ]);
  return { data, page };
}

export async function loadInspectionMeasurementsWorkspace(): Promise<InspectionReportData> {
  const authorization = await getAuthorizedClient();
  if (!authorization.supabase) return emptyInspectionData;
  return getInspectionReportData();
}

export async function loadInspectionHistoryWorkspace(): Promise<InspectionHistoryWorkspaceResult> {
  const authorization = await getAuthorizedClient();
  if (!authorization.supabase) {
    return {
      data: emptyInspectionData,
      history: { rows: [], total: 0, page: 1, pageSize: 50, error: authorization.error },
    };
  }
  const [data, history] = await Promise.all([
    getInspectionReportData(),
    searchMeasurementHistory({ dateFrom: "", dateTo: "", searchField: "", keyword: "", page: 1 }),
  ]);
  return { data, history };
}

export async function searchItemsWorkspace(filters: WorkspaceSearchFilters): Promise<ItemsWorkspaceResult> {
  const { supabase, error: authorizationError } = await getAuthorizedClient(true);
  if (!supabase) return { items: [], details: [], error: authorizationError };

  const safeFilters = {
    itemCode: cleanFilter(filters.itemCode),
    itemDetailCode: cleanFilter(filters.itemDetailCode),
    itemName: cleanFilter(filters.itemName),
    modelName: cleanFilter(filters.modelName),
  };
  const matchingDetailsResult = safeFilters.itemDetailCode
    ? await supabase
      .from("item_details")
      .select("seq, item_seq, item_detail_code, item_detail_name, image_path, material, note")
      .ilike("item_detail_code", `%${escapeLikePattern(safeFilters.itemDetailCode)}%`)
      .order("seq")
    : null;
  if (matchingDetailsResult?.error) {
    console.error("Failed to search item details", { code: matchingDetailsResult.error.code });
    return { items: [], details: [], error: "품목상세를 불러오지 못했어요." };
  }
  const matchingItemSeqs = [...new Set((matchingDetailsResult?.data ?? []).map((detail) => detail.item_seq))];
  if (safeFilters.itemDetailCode && matchingItemSeqs.length === 0) {
    return { items: [], details: [], error: null };
  }

  let query = supabase
    .from("items")
    .select("seq, item_code, item_name, image_path, model_name, note")
    .order("seq");
  if (safeFilters.itemCode) query = query.ilike("item_code", `%${escapeLikePattern(safeFilters.itemCode)}%`);
  if (safeFilters.itemName) query = query.ilike("item_name", `%${escapeLikePattern(safeFilters.itemName)}%`);
  if (safeFilters.modelName) query = query.ilike("model_name", `%${escapeLikePattern(safeFilters.modelName)}%`);
  if (safeFilters.itemDetailCode) query = query.in("seq", matchingItemSeqs);

  const itemsResult = await query;
  const itemSeqs = (itemsResult.data ?? []).map((item) => item.seq);
  const detailsResult = safeFilters.itemDetailCode
    ? { data: (matchingDetailsResult?.data ?? []).filter((detail) => itemSeqs.includes(detail.item_seq)), error: null }
    : itemSeqs.length
    ? await supabase
      .from("item_details")
      .select("seq, item_seq, item_detail_code, item_detail_name, image_path, material, note")
      .in("item_seq", itemSeqs)
      .order("seq")
    : { data: [], error: null };
  const loadError = itemsResult.error || detailsResult.error;
  if (loadError) {
    console.error("Failed to search item workspace", { code: loadError.code });
    return { items: [], details: [], error: "품목을 불러오지 못했어요." };
  }

  try {
    const images = await attachItemImageUrls(
      supabase,
      (itemsResult.data ?? []) as Omit<Item, "image_url">[],
      (detailsResult.data ?? []) as Omit<ItemDetail, "image_url">[],
    );
    return { items: images.items, details: images.details, error: null };
  } catch (error) {
    console.error("Failed to sign item workspace image URLs", { message: error instanceof Error ? error.message : "Unknown storage error" });
    return { items: [], details: [], error: "품목 이미지를 불러오지 못했어요." };
  }
}

export async function searchToleranceWorkspace(filters: WorkspaceSearchFilters): Promise<ToleranceWorkspaceResult> {
  const { supabase, error: authorizationError } = await getAuthorizedClient(true);
  if (!supabase) return { items: [], ranges: [], error: authorizationError };

  const safeFilters = {
    itemCode: cleanFilter(filters.itemCode),
    itemName: cleanFilter(filters.itemName),
    modelName: cleanFilter(filters.modelName),
  };
  let query = supabase
    .from("items")
    .select("seq, item_code, item_name, model_name")
    .order("seq");
  if (safeFilters.itemCode) query = query.ilike("item_code", `%${escapeLikePattern(safeFilters.itemCode)}%`);
  if (safeFilters.itemName) query = query.ilike("item_name", `%${escapeLikePattern(safeFilters.itemName)}%`);
  if (safeFilters.modelName) query = query.ilike("model_name", `%${escapeLikePattern(safeFilters.modelName)}%`);

  const itemsResult = await query;
  const itemSeqs = (itemsResult.data ?? []).map((item) => item.seq);
  const rangesResult = itemSeqs.length
    ? await supabase
      .from("item_tolerance_ranges")
      .select("seq, item_seq, nominal_min, nominal_max, upper_deviation, lower_deviation, note")
      .in("item_seq", itemSeqs)
      .order("item_seq")
      .order("nominal_min")
    : { data: [], error: null };
  const loadError = itemsResult.error || rangesResult.error;
  if (loadError) {
    console.error("Failed to search tolerance workspace", { code: loadError.code });
    return { items: [], ranges: [], error: "오차범위를 불러오지 못했어요." };
  }
  return {
    items: (itemsResult.data ?? []) as ToleranceItem[],
    ranges: (rangesResult.data ?? []) as ItemToleranceRange[],
    error: null,
  };
}

export async function loadCodesWorkspace(): Promise<CodesWorkspaceResult> {
  const { supabase, error: authorizationError } = await getAuthorizedClient(true);
  if (!supabase) return { groups: [], details: [], error: authorizationError };
  const [groupsResult, detailsResult] = await Promise.all([
    supabase.from("code_groups").select("seq, group_code, group_name, description, sort_order, is_active").order("sort_order").order("seq"),
    supabase.from("code_details").select("seq, code_group_seq, code, code_name, description, sort_order, is_active").order("sort_order").order("seq"),
  ]);
  const loadError = groupsResult.error || detailsResult.error;
  if (loadError) {
    console.error("Failed to load code workspace", { code: loadError.code });
    return { groups: [], details: [], error: "코드를 불러오지 못했어요." };
  }
  return {
    groups: (groupsResult.data ?? []) as CodeGroup[],
    details: (detailsResult.data ?? []) as CodeDetail[],
    error: null,
  };
}
