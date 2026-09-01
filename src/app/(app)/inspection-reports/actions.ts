"use server";

import { revalidatePath } from "next/cache";

import { itemImageBucket } from "@/lib/item-images";
import { createClient } from "@/lib/supabase/server";
import { createSignedFileUrls } from "@/lib/supabase/storage";

import type { InspectionReport, InspectionReportActionState, InspectionReportDraftItem, InspectionReportPage, InspectionReportQuery, InspectionToleranceRange, InspectionToleranceRangeResult } from "./types";

const inspectionReportsPath = "/inspection-reports";
const inspectionMeasurementsPath = "/inspection-measurements";
const codeManagementPath = "/master/codes";
const reportPageSize = 50;
const reportColumns = "seq, model_name, item_seq, item_code, item_name, item_detail_seq, item_detail_code, item_detail_name, material, image_path, customer_name, supplier_name, delivery_quantity, sample_count, delivery_date, delivery_quantity_text, sample_count_text, delivery_date_text, product_type_code_seq, product_type_code, product_type_name, hardness, heat_treatment, final_judgment_code_seq";
const reportSearchColumns = { model: "model_name", drawing: "item_detail_code", itemName: "item_name", customer: "customer_name", supplier: "supplier_name" } as const;

function safeSearchTerm(value: string) {
  return value.trim().slice(0, 100).replace(/[,*()"\\]/g, " ").replace(/\s+/g, " ");
}

export async function searchInspectionReports(query: InspectionReportQuery): Promise<InspectionReportPage> {
  const page = Number.isInteger(query.page) && query.page > 0 && query.page <= 1_000_000 ? query.page : 1;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { rows: [], total: 0, page, pageSize: reportPageSize, error: "로그인이 필요해요." };

  const keyword = safeSearchTerm(query.keyword);
  let request = supabase.from("inspection_reports").select(reportColumns, { count: "exact" }).eq("is_deleted", false);
  if (keyword) {
    if (query.searchField === "all") {
      const filters = ["model_name", "item_code", "item_name", "item_detail_code", "item_detail_name", "customer_name", "supplier_name"].map((column) => `${column}.ilike.*${keyword}*`);
      request = request.or(filters.join(","));
    } else {
      const column = reportSearchColumns[query.searchField as keyof typeof reportSearchColumns];
      if (column) request = request.ilike(column, `%${keyword}%`);
    }
  }

  const from = (page - 1) * reportPageSize;
  const ascending = query.sortOrder === "oldest";
  const { data, error, count } = await request.order("seq", { ascending }).range(from, from + reportPageSize - 1);
  if (error) {
    console.error("Failed to search inspection reports", { code: error.code });
    return { rows: [], total: 0, page, pageSize: reportPageSize, error: "검사성적서를 조회하지 못했어요." };
  }
  const rows = (data ?? []) as Omit<InspectionReport, "image_url">[];
  let signedUrls = new Map<string, string>();
  try {
    signedUrls = await createSignedFileUrls(supabase, itemImageBucket, rows.map((row) => row.image_path));
  } catch (signError) {
    console.error("Failed to sign inspection report image URLs", { message: signError instanceof Error ? signError.message : "Unknown storage error" });
  }
  return {
    rows: rows.map((row) => ({ ...row, image_url: row.image_path ? signedUrls.get(row.image_path) ?? null : null })),
    total: count ?? 0,
    page,
    pageSize: reportPageSize,
    error: null,
  };
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function positiveInteger(value: string) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function optionalPositiveInteger(value: string) {
  return value ? positiveInteger(value) : null;
}

function numeric(value: string) {
  const normalized = value.trim().replaceAll(",", "").replace(/[−–—]/g, "-").replaceAll("＋", "+");
  if (!normalized || !/^[+-]?\d+(?:\.\d{1,4})?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function toleranceText(value: string) {
  return value.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").trim();
}

function optionalNumeric(value: string) {
  return value.trim() ? numeric(value.trim()) : null;
}

function parseItems(value: string): InspectionReportDraftItem[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length > 50) return null;
    return parsed.every((item) => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<InspectionReportDraftItem>;
      const markerValid = candidate.markerXRatio === null && candidate.markerYRatio === null || typeof candidate.markerXRatio === "number" && candidate.markerXRatio >= 0 && candidate.markerXRatio <= 1 && typeof candidate.markerYRatio === "number" && candidate.markerYRatio >= 0 && candidate.markerYRatio <= 1;
      return typeof candidate.nominalDimension === "string" && typeof candidate.toleranceMin === "string" && typeof candidate.toleranceMax === "string" && Array.isArray(candidate.results) && candidate.results.length === 10 && candidate.results.every((result) => typeof result === "string") && typeof candidate.note === "string" && (candidate.isDirectCode === undefined || typeof candidate.isDirectCode === "boolean") && markerValid;
    }) ? parsed as InspectionReportDraftItem[] : null;
  } catch {
    return null;
  }
}

function mutationError(message = "저장하지 못했어요. 잠시 후 다시 시도해 주세요."): InspectionReportActionState {
  return { status: "error", message };
}

export async function saveInspectionReport(
  _previousState: InspectionReportActionState,
  formData: FormData,
): Promise<InspectionReportActionState> {
  const seq = optionalPositiveInteger(text(formData, "seq"));
  const itemDetailSeq = positiveInteger(text(formData, "itemDetailSeq"));
  const deliveryQuantity = optionalPositiveInteger(text(formData, "deliveryQuantity"));
  const sampleCount = optionalPositiveInteger(text(formData, "sampleCount"));
  const productTypeCodeSeq = optionalPositiveInteger(text(formData, "productTypeCodeSeq"));
  const finalJudgmentCodeSeq = optionalPositiveInteger(text(formData, "finalJudgmentCodeSeq"));
  const customerName = text(formData, "customerName");
  const supplierName = text(formData, "supplierName");
  const items = parseItems(text(formData, "items"));

  if (!itemDetailSeq || deliveryQuantity !== null && !deliveryQuantity || sampleCount !== null && (!sampleCount || sampleCount > 10) || deliveryQuantity !== null && sampleCount !== null && sampleCount > deliveryQuantity || customerName.length > 100 || supplierName.length > 100 || !items) {
    return mutationError("품목상세와 수량 정보를 다시 확인해 주세요.");
  }

  const normalizedItems = items.map((item) => ({
    nominal: item.nominalDimension.trim(),
    min: toleranceText(item.toleranceMin),
    max: toleranceText(item.toleranceMax),
    markerXRatio: item.markerXRatio,
    markerYRatio: item.markerYRatio,
  }));
  for (let index = 0; index < normalizedItems.length; index += 1) {
    const item = normalizedItems[index];
    if (!item.nominal) return mutationError(`${index + 1}번 검사항목의 기준치수를 입력해 주세요.`);
    if (item.nominal.length > 100) return mutationError(`${index + 1}번 검사항목의 기준치수는 100자 이하로 입력해 주세요.`);
    if (!item.min || !item.max) return mutationError(`${index + 1}번 검사항목의 공차 min과 max를 입력해 주세요.`);
    if (item.min.length > 100 || item.max.length > 100) return mutationError(`${index + 1}번 검사항목의 공차는 100자 이하로 입력해 주세요.`);
    const minNumber = numeric(item.min);
    const maxNumber = numeric(item.max);
    if (minNumber !== null && maxNumber !== null && minNumber > maxNumber) return mutationError(`${index + 1}번 검사항목의 공차 min은 공차 max보다 작거나 같아야 해요.`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return mutationError("로그인이 필요해요.");

  const { data: selectedDetail, error: detailError } = await supabase.from("item_details").select("seq, items!inner(model_name)").eq("seq", itemDetailSeq).maybeSingle();
  const detail = selectedDetail as unknown as { seq: number; items: { model_name: string | null } } | null;
  if (detailError || !detail?.items.model_name) return mutationError("기종이 등록된 품목상세를 선택해 주세요.");

  const directCodeNames = [...new Set(items.filter((item) => item.isDirectCode).map((item) => item.nominalDimension.trim()).filter(Boolean))];
  if (directCodeNames.length > 0) {
    const { error: codeError } = await supabase.rpc("ensure_u0003_codes", { p_code_names: directCodeNames });
    if (codeError) {
      console.error("Failed to ensure U0003 codes", { code: codeError.code });
      return mutationError("직접 입력한 기준치수를 코드에 추가하지 못했어요. 다시 시도해 주세요.");
    }
  }

  const masterValues = {
    item_detail_seq: itemDetailSeq,
    customer_name: customerName || null,
    supplier_name: supplierName || null,
    delivery_quantity: deliveryQuantity,
    sample_count: sampleCount,
    product_type_code_seq: productTypeCodeSeq,
    hardness: text(formData, "hardness") || null,
    heat_treatment: text(formData, "heatTreatment") || null,
    final_judgment_code_seq: finalJudgmentCodeSeq,
  };

  let reportSeq = seq;
  let replaceItems = true;
  let resetMeasurementsToNewStructure = false;
  if (seq) {
    const [{ data: existingItems, error: existingItemsError }, { data: existingMeasurements, error: existingMeasurementsError }] = await Promise.all([
      supabase.from("inspection_report_items").select("seq, sort_order, nominal_dimension, tolerance_min, tolerance_max, marker_x_ratio, marker_y_ratio").eq("inspection_report_seq", seq).order("sort_order"),
      supabase.from("inspection_report_measurements").select("result_1, result_2, result_3, result_4, result_5, result_6, result_7, result_8, result_9, result_10, note").eq("inspection_report_seq", seq),
    ]);
    if (existingItemsError || existingMeasurementsError) {
      console.error("Failed to load current inspection report structure before update", { itemCode: existingItemsError?.code, measurementCode: existingMeasurementsError?.code });
      return mutationError("현재 검사항목과 측정결과를 확인하지 못해 수정하지 않았어요.");
    }
    const structureChanged = (existingItems?.length ?? 0) !== normalizedItems.length || normalizedItems.some((item, index) => {
      const existing = existingItems?.[index];
      return !existing || existing.nominal_dimension.trim() !== item.nominal || (existing.tolerance_min ?? "").trim() !== item.min || (existing.tolerance_max ?? "").trim() !== item.max;
    });
    const hasResults = (existingMeasurements ?? []).some((measurement) =>
      Array.from({ length: 10 }, (_, index) => measurement[`result_${index + 1}` as keyof typeof measurement]).some((value) => value !== null)
      || Boolean(measurement.note?.trim()),
    );
    if (structureChanged && hasResults) {
      const { data: latestRun, error: runError } = await supabase
        .from("inspection_measurement_runs")
        .select("seq")
        .eq("inspection_report_seq", seq)
        .order("run_no", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (runError || !latestRun) {
        console.error("Failed to verify inspection measurement history before replacing items", { code: runError?.code });
        return mutationError("현재 측정결과의 과거 이력을 확인하지 못해 검사항목을 변경하지 않았어요.");
      }
      const { data: historyItems, error: historyItemsError } = await supabase
        .from("inspection_measurement_run_items")
        .select("source_report_item_seq")
        .eq("measurement_run_seq", latestRun.seq);
      const currentItemSeqs = new Set((existingItems ?? []).map((item) => item.seq));
      const hasCurrentStructureSnapshot = (historyItems?.length ?? 0) === currentItemSeqs.size
        && (historyItems ?? []).every((item) => item.source_report_item_seq !== null && currentItemSeqs.has(item.source_report_item_seq));
      if (historyItemsError || !hasCurrentStructureSnapshot) {
        console.error("Inspection measurement history does not match current item structure", { code: historyItemsError?.code });
        return mutationError("현재 측정결과와 일치하는 과거 이력을 확인하지 못해 검사항목을 변경하지 않았어요.");
      }
      resetMeasurementsToNewStructure = true;
    }
    replaceItems = structureChanged;
    const { error } = await supabase.from("inspection_reports").update(masterValues).eq("seq", seq).eq("is_deleted", false);
    if (error) { console.error("Failed to update inspection report", { code: error.code }); return mutationError(error.code === "23514" ? "제품구분 코드를 확인해 주세요." : undefined); }
    if (replaceItems) {
      const { error: deleteError } = await supabase.from("inspection_report_items").delete().eq("inspection_report_seq", seq);
      if (deleteError) { console.error("Failed to replace inspection report items", { code: deleteError.code }); return mutationError("기본정보는 수정됐지만 검사항목을 갱신하지 못했어요. 다시 저장해 주세요."); }
    } else {
      for (let index = 0; index < normalizedItems.length; index += 1) {
        const existing = existingItems?.[index];
        if (!existing) continue;
        const item = normalizedItems[index];
        const markerChanged = Number(existing.marker_x_ratio) !== item.markerXRatio || Number(existing.marker_y_ratio) !== item.markerYRatio || existing.marker_x_ratio === null !== (item.markerXRatio === null) || existing.marker_y_ratio === null !== (item.markerYRatio === null);
        if (!markerChanged) continue;
        const { error: markerError } = await supabase.from("inspection_report_items").update({ marker_x_ratio: item.markerXRatio, marker_y_ratio: item.markerYRatio }).eq("seq", existing.seq).eq("inspection_report_seq", seq);
        if (markerError) { console.error("Failed to update inspection item marker", { code: markerError.code }); return mutationError("기본정보는 수정됐지만 순번 위치를 저장하지 못했어요. 다시 저장해 주세요."); }
      }
    }
  } else {
    const { data, error } = await supabase.from("inspection_reports").insert(masterValues).select("seq").single();
    if (error || !data) { console.error("Failed to create inspection report", { code: error?.code }); return mutationError(error?.code === "23514" ? "제품구분 코드를 확인해 주세요." : undefined); }
    reportSeq = data.seq;
  }

  if (!replaceItems) {
    revalidatePath(inspectionReportsPath);
    revalidatePath(inspectionMeasurementsPath);
    revalidatePath(codeManagementPath);
    revalidatePath("/", "layout");
    return { status: "success", message: "검사성적서를 수정했어요.", reportSeq: reportSeq ?? undefined };
  }

  if (normalizedItems.length === 0) {
    revalidatePath(inspectionReportsPath);
    revalidatePath(inspectionMeasurementsPath);
    revalidatePath(codeManagementPath);
    revalidatePath("/", "layout");
    return { status: "success", message: resetMeasurementsToNewStructure ? "검사항목을 변경했어요. 이전 측정결과는 이력에 유지되고 현재 결과는 초기화됐어요." : seq ? "검사성적서를 수정했어요." : "검사성적서를 등록했어요.", reportSeq: reportSeq ?? undefined };
  }

  const { data: insertedItems, error: itemError } = await supabase.from("inspection_report_items").insert(normalizedItems.map((item, index) => ({
    inspection_report_seq: reportSeq as number,
    sort_order: index + 1,
    nominal_dimension: item.nominal,
    tolerance_min: item.min,
    tolerance_max: item.max,
    marker_x_ratio: item.markerXRatio,
    marker_y_ratio: item.markerYRatio,
  }))).select("seq, sort_order");

  if (itemError || !insertedItems || insertedItems.length !== normalizedItems.length) {
    console.error("Failed to save inspection report items", { code: itemError?.code });
    if (!seq && reportSeq) await supabase.from("inspection_reports").delete().eq("seq", reportSeq);
    return mutationError(seq ? "기본정보는 수정됐지만 검사항목을 저장하지 못했어요. 다시 저장해 주세요." : undefined);
  }

  const itemSeqByOrder = new Map(insertedItems.map((item) => [item.sort_order, item.seq]));
  const { error: measurementError } = await supabase.from("inspection_report_measurements").insert(normalizedItems.map((item, index) => ({
    inspection_report_seq: reportSeq as number,
    inspection_report_item_seq: itemSeqByOrder.get(index + 1) as number,
  })));
  if (measurementError) {
    console.error("Failed to save inspection report measurements", { code: measurementError.code });
    if (!seq && reportSeq) await supabase.from("inspection_reports").delete().eq("seq", reportSeq);
    return mutationError(seq ? "기본정보와 검사항목은 수정됐지만 측정결과를 저장하지 못했어요. 다시 저장해 주세요." : undefined);
  }

  revalidatePath(inspectionReportsPath);
  revalidatePath(inspectionMeasurementsPath);
  revalidatePath(codeManagementPath);
  revalidatePath("/", "layout");
  return { status: "success", message: resetMeasurementsToNewStructure ? "검사항목을 변경했어요. 이전 측정결과는 이력에 유지되고 현재 결과는 초기화됐어요." : seq ? "검사성적서를 수정했어요." : "검사성적서를 등록했어요.", reportSeq: reportSeq ?? undefined };
}

export async function getInspectionToleranceRanges(itemDetailSeq: number): Promise<InspectionToleranceRangeResult> {
  if (!Number.isSafeInteger(itemDetailSeq) || itemDetailSeq <= 0) return { ranges: [], error: null };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ranges: [], error: "로그인이 필요해요." };

  const { data: detail, error: detailError } = await supabase.from("item_details").select("item_seq").eq("seq", itemDetailSeq).maybeSingle();
  if (detailError || !detail) {
    console.error("Failed to resolve tolerance item", { code: detailError?.code });
    return { ranges: [], error: "품목의 오차범위를 조회하지 못했어요." };
  }
  const { data, error } = await supabase.from("item_tolerance_ranges").select("seq, nominal_min, nominal_max, upper_deviation, lower_deviation").eq("item_seq", detail.item_seq).order("nominal_min");
  if (error) {
    console.error("Failed to load inspection tolerance ranges", { code: error.code });
    return { ranges: [], error: "품목의 오차범위를 조회하지 못했어요." };
  }
  return { ranges: (data ?? []) as InspectionToleranceRange[], error: null };
}

export async function deleteInspectionReport(
  _previousState: InspectionReportActionState,
  formData: FormData,
): Promise<InspectionReportActionState> {
  const seq = positiveInteger(text(formData, "seq"));
  if (!seq) return mutationError("삭제할 검사성적서를 확인해 주세요.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return mutationError("로그인이 필요해요.");
  const { data, error } = await supabase.rpc("soft_delete_inspection_report", { p_seq: seq });
  if (error || !data) { console.error("Failed to soft delete inspection report", { code: error?.code }); return mutationError("검사성적서를 삭제하지 못했어요. 이미 삭제되었는지 확인해 주세요."); }
  revalidatePath(inspectionReportsPath);
  revalidatePath(inspectionMeasurementsPath);
  revalidatePath("/", "layout");
  return { status: "success", message: "검사성적서를 삭제 처리했어요." };
}

export async function saveInspectionMeasurements(
  _previousState: InspectionReportActionState,
  formData: FormData,
): Promise<InspectionReportActionState> {
  const reportSeq = positiveInteger(text(formData, "reportSeq"));
  const productTypeCodeText = text(formData, "productTypeCodeSeq");
  const productTypeCodeSeq = optionalPositiveInteger(productTypeCodeText);
  const eventTypeText = text(formData, "eventType");
  const eventType = eventTypeText === "save" || eventTypeText === "print" ? eventTypeText : null;
  const parsedRows = parseItems(text(formData, "items"));
  const modelName = text(formData, "modelName");
  const itemDetailName = text(formData, "itemDetailName");
  const itemDetailCode = text(formData, "itemDetailCode");
  const customerName = text(formData, "customerName");
  const supplierName = text(formData, "supplierName");
  const deliveryQuantityText = text(formData, "deliveryQuantity");
  const sampleCountText = text(formData, "sampleCount");
  const deliveryDate = text(formData, "deliveryDate");
  const material = text(formData, "material");
  const hardness = text(formData, "hardness");
  const heatTreatment = text(formData, "heatTreatment");
  const rows = parsedRows?.filter((row) => row.seq || row.nominalDimension.trim() || toleranceText(row.toleranceMin) || toleranceText(row.toleranceMax) || row.results.some((result) => result.trim()) || row.note.trim());
  if (!reportSeq || !rows || !eventType || productTypeCodeText && !productTypeCodeSeq) return mutationError("측정할 성적서와 제품구분, 결과를 확인해 주세요.");
  if (!modelName || !itemDetailName || !itemDetailCode || modelName.length > 100 || itemDetailName.length > 200 || itemDetailCode.length > 100 || customerName.length > 100 || supplierName.length > 100) return mutationError("성적서 기본정보를 다시 확인해 주세요.");
  if (deliveryQuantityText.length > 100 || sampleCountText.length > 100 || deliveryDate.length > 100) return mutationError("납품수량, 시료수와 납품일자는 100자 이하로 입력해 주세요.");
  if (material.length > 100 || hardness.length > 100 || heatTreatment.length > 100) return mutationError("재질, 경도와 열처리는 100자 이하로 입력해 주세요.");

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.seq) continue;
    const nominal = row.nominalDimension.trim();
    const minText = toleranceText(row.toleranceMin);
    const maxText = toleranceText(row.toleranceMax);
    const min = minText ? numeric(minText) : null;
    const max = maxText ? numeric(maxText) : null;
    if (nominal.length > 100) return mutationError(`${index + 1}번 신규 항목의 기준치수는 100자 이하로 입력해 주세요.`);
    if (minText.length > 100 || maxText.length > 100) return mutationError(`${index + 1}번 신규 항목의 공차는 100자 이하로 입력해 주세요.`);
    if (min !== null && max !== null && min > max) return mutationError(`${index + 1}번 신규 항목의 공차 하한은 상한보다 작거나 같아야 해요.`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return mutationError("로그인이 필요해요.");
  const { data: report } = await supabase.from("inspection_reports").select("sample_count").eq("seq", reportSeq).eq("is_deleted", false).maybeSingle();
  if (!report) return mutationError("측정할 성적서를 다시 확인해 주세요.");
  if (productTypeCodeSeq) {
    const { data: productType, error: productTypeError } = await supabase.from("code_details").select("seq, code_groups!inner(group_code)").eq("seq", productTypeCodeSeq).eq("is_active", true).eq("code_groups.group_code", "U0002").maybeSingle();
    if (productTypeError || !productType) return mutationError("제품구분을 다시 선택해 주세요.");
  }
  const results = rows.map((row) => row.results.map(optionalNumeric));
  if (rows.some((row) => row.note.length > 500)) {
    return mutationError("측정결과와 비고를 다시 확인해 주세요.");
  }

  const payload = rows.map((row, index) => {
    const values = results[index];
    return {
      item_seq: row.seq ?? null,
      nominal_dimension: row.nominalDimension.trim(),
      tolerance_min: toleranceText(row.toleranceMin),
      tolerance_max: toleranceText(row.toleranceMax),
      result_1: values[0], result_2: values[1], result_3: values[2], result_4: values[3], result_5: values[4],
      result_6: values[5], result_7: values[6], result_8: values[7], result_9: values[8], result_10: values[9],
      note: row.note.trim() || null,
    };
  });
  const { data: saveResult, error } = await supabase.rpc("save_inspection_measurement_entry", {
    p_inspection_report_seq: reportSeq,
    p_product_type_code_seq: productTypeCodeSeq,
    p_event_type: eventType,
    p_model_name: modelName,
    p_item_detail_code: itemDetailCode,
    p_item_detail_name: itemDetailName,
    p_customer_name: customerName,
    p_supplier_name: supplierName,
    p_delivery_quantity_text: deliveryQuantityText,
    p_sample_count_text: sampleCountText,
    p_delivery_date_text: deliveryDate,
    p_material: material,
    p_hardness: hardness,
    p_heat_treatment: heatTreatment,
    p_rows: payload,
  });
  const result = saveResult as { run_seq?: unknown; item_seqs?: unknown } | null;
  const runSeq = typeof result?.run_seq === "number" ? result.run_seq : null;
  const itemSeqs = Array.isArray(result?.item_seqs) && result.item_seqs.every((seq) => typeof seq === "number") ? result.item_seqs : null;
  if (error || runSeq === null || !itemSeqs || itemSeqs.length !== rows.length) {
    console.error("Failed to save measurement run", { code: error?.code });
    return mutationError(error?.code === "23514" ? "제품구분 또는 신규 검사항목을 다시 확인해 주세요." : "측정결과 이력을 저장하지 못했어요. 다시 시도해 주세요.");
  }
  revalidatePath(inspectionReportsPath);
  revalidatePath(inspectionMeasurementsPath);
  revalidatePath("/", "layout");
  return { status: "success", message: eventType === "print" ? "인쇄 전 변경 내용을 저장했어요." : "성적서 정보와 측정결과를 저장했어요.", reportSeq, runSeq, itemSeqs, eventType };
}
