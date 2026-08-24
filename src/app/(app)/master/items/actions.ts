"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import type { ItemActionState } from "./types";

const itemsPath = "/master/items";

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
    return { error: "관리자만 품목을 변경할 수 있어요.", supabase: null };
  }

  return { error: null, supabase };
}

function mapMutationError(code?: string, isItemDelete = false): ItemActionState {
  if (code === "23505") {
    return { status: "error", message: "이미 사용 중인 코드예요. 다른 코드를 입력해 주세요." };
  }
  if (code === "23503" && isItemDelete) {
    return {
      status: "error",
      message: "품목상세 또는 오차범위가 있는 품목은 삭제할 수 없어요. 연결된 정보를 먼저 정리해 주세요.",
    };
  }
  return { status: "error", message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
}

export async function saveItem(
  _previousState: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const seqText = getText(formData, "seq");
  const seq = seqText ? getPositiveInteger(formData, "seq") : null;
  const itemCode = getText(formData, "itemCode");
  const itemName = getText(formData, "itemName");
  const modelName = getOptionalText(formData, "modelName");
  const note = getOptionalText(formData, "note");
  const errors: Record<string, string> = {};

  if (seqText && !seq) errors.seq = "수정할 품목을 확인해 주세요.";
  if (itemCode.length < 1 || itemCode.length > 80) errors.itemCode = "품목코드는 80자 이하로 입력해 주세요.";
  if (itemName.length < 1 || itemName.length > 100) errors.itemName = "품목명은 100자 이하로 입력해 주세요.";
  if (modelName && modelName.length > 100) errors.modelName = "모델명은 100자 이하로 입력해 주세요.";
  if (note && note.length > 500) errors.note = "비고는 500자 이하로 입력해 주세요.";
  if (Object.keys(errors).length) return { status: "error", message: "입력한 내용을 다시 확인해 주세요.", errors };

  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) return { status: "error", message: authorizationError ?? "권한을 확인해 주세요." };

  const values = { item_code: itemCode, item_name: itemName, model_name: modelName, note };
  const { error } = seq
    ? await supabase.from("items").update(values).eq("seq", seq)
    : await supabase.from("items").insert(values);

  if (error) {
    console.error("Failed to save item", { code: error.code });
    return mapMutationError(error.code);
  }
  revalidatePath(itemsPath);
  return { status: "success", message: seq ? "품목을 수정했어요." : "품목을 추가했어요." };
}

export async function saveItemDetail(
  _previousState: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const seqText = getText(formData, "seq");
  const seq = seqText ? getPositiveInteger(formData, "seq") : null;
  const itemSeq = getPositiveInteger(formData, "itemSeq");
  const itemDetailCode = getText(formData, "itemDetailCode");
  const itemDetailName = getText(formData, "itemDetailName");
  const material = getOptionalText(formData, "material");
  const note = getOptionalText(formData, "note");
  const errors: Record<string, string> = {};

  if (seqText && !seq) errors.seq = "수정할 품목상세를 확인해 주세요.";
  if (!itemSeq) errors.itemSeq = "품목을 선택해 주세요.";
  if (itemDetailCode.length < 1 || itemDetailCode.length > 80) errors.itemDetailCode = "상세코드는 80자 이하로 입력해 주세요.";
  if (itemDetailName.length < 1 || itemDetailName.length > 100) errors.itemDetailName = "상세명은 100자 이하로 입력해 주세요.";
  if (material && material.length > 100) errors.material = "소재는 100자 이하로 입력해 주세요.";
  if (note && note.length > 500) errors.note = "비고는 500자 이하로 입력해 주세요.";
  if (Object.keys(errors).length) return { status: "error", message: "입력한 내용을 다시 확인해 주세요.", errors };

  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) return { status: "error", message: authorizationError ?? "권한을 확인해 주세요." };

  const values = {
    item_seq: itemSeq as number,
    item_detail_code: itemDetailCode,
    item_detail_name: itemDetailName,
    material,
    note,
  };
  const { error } = seq
    ? await supabase.from("item_details").update(values).eq("seq", seq)
    : await supabase.from("item_details").insert(values);

  if (error) {
    console.error("Failed to save item detail", { code: error.code });
    return mapMutationError(error.code);
  }
  revalidatePath(itemsPath);
  return { status: "success", message: seq ? "품목상세를 수정했어요." : "품목상세를 추가했어요." };
}

export async function deleteItem(
  _previousState: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const seq = getPositiveInteger(formData, "seq");
  if (!seq) return { status: "error", message: "삭제할 품목을 확인해 주세요." };
  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) return { status: "error", message: authorizationError ?? "권한을 확인해 주세요." };
  const { error } = await supabase.from("items").delete().eq("seq", seq);
  if (error) return mapMutationError(error.code, true);
  revalidatePath(itemsPath);
  return { status: "success", message: "품목을 삭제했어요." };
}

export async function deleteItemDetail(
  _previousState: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const seq = getPositiveInteger(formData, "seq");
  if (!seq) return { status: "error", message: "삭제할 품목상세를 확인해 주세요." };
  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) return { status: "error", message: authorizationError ?? "권한을 확인해 주세요." };
  const { error } = await supabase.from("item_details").delete().eq("seq", seq);
  if (error) return mapMutationError(error.code);
  revalidatePath(itemsPath);
  return { status: "success", message: "품목상세를 삭제했어요." };
}
