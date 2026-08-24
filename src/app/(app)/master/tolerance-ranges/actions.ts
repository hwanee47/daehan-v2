"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import type { ToleranceActionState } from "./types";

const toleranceRangesPath = "/master/tolerance-ranges";
const decimalPattern = /^[+-]?\d{1,8}(?:\.\d{1,4})?$/;

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalText(formData: FormData, key: string) {
  return getText(formData, key) || null;
}

function getPositiveInteger(formData: FormData, key: string) {
  const value = Number(getText(formData, key));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function getDecimal(formData: FormData, key: string) {
  const text = getText(formData, key);
  if (!decimalPattern.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

async function getAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요해요.", supabase: null };

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || profile?.role !== "admin") {
    return { error: "관리자만 오차범위를 변경할 수 있어요.", supabase: null };
  }

  return { error: null, supabase };
}

function mapMutationError(code?: string): ToleranceActionState {
  if (code === "23P01") {
    return {
      status: "error",
      message: "같은 품목에 겹치는 치수 범위가 있어요. 기존 범위를 확인해 주세요.",
    };
  }
  if (code === "23503") {
    return { status: "error", message: "선택한 품목을 확인해 주세요." };
  }
  if (code === "23514" || code === "22003") {
    return { status: "error", message: "치수 범위와 편차 값을 다시 확인해 주세요." };
  }
  return { status: "error", message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
}

export async function saveToleranceRange(
  _previousState: ToleranceActionState,
  formData: FormData,
): Promise<ToleranceActionState> {
  const seqText = getText(formData, "seq");
  const seq = seqText ? getPositiveInteger(formData, "seq") : null;
  const itemSeq = getPositiveInteger(formData, "itemSeq");
  const nominalMin = getDecimal(formData, "nominalMin");
  const nominalMax = getDecimal(formData, "nominalMax");
  const upperDeviation = getDecimal(formData, "upperDeviation");
  const lowerDeviation = getDecimal(formData, "lowerDeviation");
  const note = getOptionalText(formData, "note");
  const errors: Record<string, string> = {};

  if (seqText && !seq) errors.seq = "수정할 오차범위를 확인해 주세요.";
  if (!itemSeq) errors.itemSeq = "품목을 선택해 주세요.";
  if (nominalMin === null || nominalMin < 0) {
    errors.nominalMin = "하한은 0 이상의 숫자로 소수점 넷째 자리까지 입력해 주세요.";
  }
  if (nominalMax === null) {
    errors.nominalMax = "상한은 숫자로 소수점 넷째 자리까지 입력해 주세요.";
  } else if (nominalMin !== null && nominalMax <= nominalMin) {
    errors.nominalMax = "상한은 하한보다 커야 해요.";
  }
  if (upperDeviation === null) {
    errors.upperDeviation = "상한 편차를 숫자로 소수점 넷째 자리까지 입력해 주세요.";
  }
  if (lowerDeviation === null) {
    errors.lowerDeviation = "하한 편차를 숫자로 소수점 넷째 자리까지 입력해 주세요.";
  } else if (upperDeviation !== null && lowerDeviation > upperDeviation) {
    errors.lowerDeviation = "하한 편차는 상한 편차보다 작거나 같아야 해요.";
  }
  if (note && note.length > 500) errors.note = "비고는 500자 이하로 입력해 주세요.";

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "입력한 내용을 다시 확인해 주세요.", errors };
  }

  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) {
    return { status: "error", message: authorizationError ?? "권한을 확인해 주세요." };
  }

  const values = {
    item_seq: itemSeq as number,
    nominal_min: nominalMin as number,
    nominal_max: nominalMax as number,
    upper_deviation: upperDeviation as number,
    lower_deviation: lowerDeviation as number,
    note,
  };
  const { error } = seq
    ? await supabase.from("item_tolerance_ranges").update(values).eq("seq", seq)
    : await supabase.from("item_tolerance_ranges").insert(values);

  if (error) {
    console.error("Failed to save tolerance range", { code: error.code });
    return mapMutationError(error.code);
  }

  revalidatePath(toleranceRangesPath);
  return { status: "success", message: seq ? "오차범위를 수정했어요." : "오차범위를 추가했어요." };
}

export async function deleteToleranceRange(
  _previousState: ToleranceActionState,
  formData: FormData,
): Promise<ToleranceActionState> {
  const seq = getPositiveInteger(formData, "seq");
  if (!seq) return { status: "error", message: "삭제할 오차범위를 확인해 주세요." };

  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) {
    return { status: "error", message: authorizationError ?? "권한을 확인해 주세요." };
  }

  const { error } = await supabase.from("item_tolerance_ranges").delete().eq("seq", seq);
  if (error) {
    console.error("Failed to delete tolerance range", { code: error.code });
    return mapMutationError(error.code);
  }

  revalidatePath(toleranceRangesPath);
  return { status: "success", message: "오차범위를 삭제했어요." };
}
