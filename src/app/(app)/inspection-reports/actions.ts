"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import type { InspectionReportActionState, InspectionReportDraftItem, InspectionToleranceRange, InspectionToleranceRangeResult } from "./types";

const inspectionReportsPath = "/inspection-reports";
const inspectionMeasurementsPath = "/inspection-measurements";

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
  if (!value || !/^-?\d+(?:\.\d{1,4})?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function optionalNumeric(value: string) {
  return value.trim() ? numeric(value.trim()) : null;
}

function firstNumeric(value: string) {
  const match = value.match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)/);
  return match ? numeric(match[0]) : null;
}

function parseItems(value: string): InspectionReportDraftItem[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length > 50) return null;
    return parsed.every((item) => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<InspectionReportDraftItem>;
      const markerValid = candidate.markerXRatio === null && candidate.markerYRatio === null || typeof candidate.markerXRatio === "number" && candidate.markerXRatio >= 0 && candidate.markerXRatio <= 1 && typeof candidate.markerYRatio === "number" && candidate.markerYRatio >= 0 && candidate.markerYRatio <= 1;
      return typeof candidate.nominalDimension === "string" && typeof candidate.toleranceMin === "string" && typeof candidate.toleranceMax === "string" && Array.isArray(candidate.results) && candidate.results.length === 10 && candidate.results.every((result) => typeof result === "string") && typeof candidate.note === "string" && markerValid;
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
    nominal: firstNumeric(item.nominalDimension),
    min: numeric(item.toleranceMin),
    max: numeric(item.toleranceMax),
    markerXRatio: item.markerXRatio,
    markerYRatio: item.markerYRatio,
  }));
  if (normalizedItems.some((item) => item.nominal === null || item.min === null || item.max === null || (item.min as number) > (item.max as number))) {
    return mutationError("검사항목의 기준치수와 공차를 다시 확인해 주세요.");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return mutationError("로그인이 필요해요.");

  const { data: selectedDetail, error: detailError } = await supabase.from("item_details").select("seq, items!inner(model_name)").eq("seq", itemDetailSeq).maybeSingle();
  const detail = selectedDetail as unknown as { seq: number; items: { model_name: string | null } } | null;
  if (detailError || !detail?.items.model_name) return mutationError("기종이 등록된 품목상세를 선택해 주세요.");

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
  if (seq) {
    const [{ data: existingItems }, { data: existingMeasurements }] = await Promise.all([
      supabase.from("inspection_report_items").select("seq, sort_order, nominal_dimension, tolerance_min, tolerance_max, marker_x_ratio, marker_y_ratio").eq("inspection_report_seq", seq).order("sort_order"),
      supabase.from("inspection_report_measurements").select("result_1, result_2, result_3, result_4, result_5, result_6, result_7, result_8, result_9, result_10").eq("inspection_report_seq", seq),
    ]);
    const structureChanged = (existingItems?.length ?? 0) !== normalizedItems.length || normalizedItems.some((item, index) => {
      const existing = existingItems?.[index];
      return !existing || Number(existing.nominal_dimension) !== item.nominal || Number(existing.tolerance_min) !== item.min || Number(existing.tolerance_max) !== item.max;
    });
    const hasResults = (existingMeasurements ?? []).some((measurement) => Array.from({ length: 10 }, (_, index) => measurement[`result_${index + 1}` as keyof typeof measurement]).some((value) => value !== null));
    if (structureChanged && hasResults) return mutationError("측정결과가 입력된 성적서는 검사항목 구조를 변경할 수 없어요.");
    replaceItems = structureChanged;
    const { error } = await supabase.from("inspection_reports").update(masterValues).eq("seq", seq);
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
    revalidatePath("/", "layout");
    return { status: "success", message: "검사성적서를 수정했어요.", reportSeq: reportSeq ?? undefined };
  }

  if (normalizedItems.length === 0) {
    revalidatePath(inspectionReportsPath);
    revalidatePath(inspectionMeasurementsPath);
    revalidatePath("/", "layout");
    return { status: "success", message: seq ? "검사성적서를 수정했어요." : "검사성적서를 등록했어요.", reportSeq: reportSeq ?? undefined };
  }

  const { data: insertedItems, error: itemError } = await supabase.from("inspection_report_items").insert(normalizedItems.map((item, index) => ({
    inspection_report_seq: reportSeq as number,
    sort_order: index + 1,
    nominal_dimension: item.nominal as number,
    tolerance_min: item.min as number,
    tolerance_max: item.max as number,
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
  revalidatePath("/", "layout");
  return { status: "success", message: seq ? "검사성적서를 수정했어요." : "검사성적서를 등록했어요.", reportSeq: reportSeq ?? undefined };
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
  const { error } = await supabase.from("inspection_reports").delete().eq("seq", seq);
  if (error) { console.error("Failed to delete inspection report", { code: error.code }); return mutationError("검사성적서를 삭제하지 못했어요. 권한을 확인해 주세요."); }
  revalidatePath(inspectionReportsPath);
  revalidatePath(inspectionMeasurementsPath);
  revalidatePath("/", "layout");
  return { status: "success", message: "검사성적서를 삭제했어요." };
}

export async function saveInspectionMeasurements(
  _previousState: InspectionReportActionState,
  formData: FormData,
): Promise<InspectionReportActionState> {
  const reportSeq = positiveInteger(text(formData, "reportSeq"));
  const productTypeCodeText = text(formData, "productTypeCodeSeq");
  const productTypeCodeSeq = optionalPositiveInteger(productTypeCodeText);
  const eventType = text(formData, "eventType") === "print" ? "print" : "save";
  const rows = parseItems(text(formData, "items"));
  if (!reportSeq || !rows || productTypeCodeText && !productTypeCodeSeq) return mutationError("측정할 성적서와 제품구분, 결과를 확인해 주세요.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return mutationError("로그인이 필요해요.");
  const { data: report } = await supabase.from("inspection_reports").select("sample_count").eq("seq", reportSeq).maybeSingle();
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
    if (!row.seq) return null;
    const values = results[index];
    return {
      item_seq: row.seq,
      result_1: values[0], result_2: values[1], result_3: values[2], result_4: values[3], result_5: values[4],
      result_6: values[5], result_7: values[6], result_8: values[7], result_9: values[8], result_10: values[9],
      note: row.note.trim() || null,
    };
  });
  if (payload.some((row) => row === null)) return mutationError("검사항목을 다시 불러와 주세요.");
  const { data: runSeq, error } = await supabase.rpc("save_inspection_measurement_run", {
    p_inspection_report_seq: reportSeq,
    p_product_type_code_seq: productTypeCodeSeq,
    p_event_type: eventType,
    p_rows: payload,
  });
  if (error || typeof runSeq !== "number") {
    console.error("Failed to save measurement run", { code: error?.code });
    return mutationError(error?.code === "23514" ? "제품구분 코드가 올바르지 않아요." : "측정결과 이력을 저장하지 못했어요. 다시 시도해 주세요.");
  }
  revalidatePath(inspectionReportsPath);
  revalidatePath(inspectionMeasurementsPath);
  revalidatePath("/", "layout");
  return { status: "success", message: eventType === "print" ? "인쇄 이력을 저장했어요." : "측정결과와 이력을 저장했어요.", reportSeq, runSeq, eventType };
}
