"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import type { CodeActionState } from "./types";

const codesPath = "/master/codes";

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

function getSortOrder(formData: FormData) {
  const value = Number(getText(formData, "sortOrder"));
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

async function getAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요해요.", supabase: null };
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || profile?.role !== "admin") {
    return { error: "관리자만 코드를 변경할 수 있어요.", supabase: null };
  }

  return { error: null, supabase };
}

function mapMutationError(code?: string, isGroupDelete = false): CodeActionState {
  if (code === "23505") {
    return { status: "error", message: "이미 사용 중인 코드예요. 다른 코드를 입력해 주세요." };
  }

  if (code === "23503" && isGroupDelete) {
    return {
      status: "error",
      message: "상세 코드가 있는 그룹은 삭제할 수 없어요. 상세 코드를 먼저 정리해 주세요.",
    };
  }

  return { status: "error", message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
}

export async function saveCodeGroup(
  _previousState: CodeActionState,
  formData: FormData,
): Promise<CodeActionState> {
  const seqText = getText(formData, "seq");
  const seq = seqText ? getPositiveInteger(formData, "seq") : null;
  const groupCode = getText(formData, "groupCode");
  const groupName = getText(formData, "groupName");
  const description = getOptionalText(formData, "description");
  const sortOrder = getSortOrder(formData);
  const isActive = formData.get("isActive") === "on";
  const errors: Record<string, string> = {};

  if (seqText && !seq) errors.seq = "수정할 코드그룹을 확인해 주세요.";
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(groupCode)) {
    errors.groupCode = "그룹 코드는 영문, 숫자, _, - 조합으로 80자 이하로 입력해 주세요.";
  }
  if (groupName.length < 1 || groupName.length > 100) {
    errors.groupName = "그룹명은 100자 이하로 입력해 주세요.";
  }
  if (description && description.length > 500) {
    errors.description = "설명은 500자 이하로 입력해 주세요.";
  }
  if (sortOrder === null) errors.sortOrder = "정렬 순서는 0 이상의 정수로 입력해 주세요.";

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "입력한 내용을 다시 확인해 주세요.", errors };
  }

  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) return { status: "error", message: authorizationError ?? "권한을 확인해 주세요." };

  const values = {
    group_code: groupCode,
    group_name: groupName,
    description,
    sort_order: sortOrder as number,
    is_active: isActive,
  };
  const { error } = seq
    ? await supabase.from("code_groups").update(values).eq("seq", seq)
    : await supabase.from("code_groups").insert(values);

  if (error) {
    console.error("Failed to save code group", { code: error.code });
    return mapMutationError(error.code);
  }

  revalidatePath(codesPath);
  revalidatePath("/", "layout");
  return { status: "success", message: seq ? "코드그룹을 수정했어요." : "코드그룹을 추가했어요." };
}

export async function saveCodeDetail(
  _previousState: CodeActionState,
  formData: FormData,
): Promise<CodeActionState> {
  const seqText = getText(formData, "seq");
  const seq = seqText ? getPositiveInteger(formData, "seq") : null;
  const codeGroupSeq = getPositiveInteger(formData, "codeGroupSeq");
  const code = getText(formData, "code");
  const codeName = getText(formData, "codeName");
  const description = getOptionalText(formData, "description");
  const sortOrder = getSortOrder(formData);
  const isActive = formData.get("isActive") === "on";
  const errors: Record<string, string> = {};

  if (seqText && !seq) errors.seq = "수정할 상세 코드를 확인해 주세요.";
  if (!codeGroupSeq) errors.codeGroupSeq = "코드그룹을 선택해 주세요.";
  if (code.length < 1 || code.length > 80) errors.code = "코드는 80자 이하로 입력해 주세요.";
  if (codeName.length < 1 || codeName.length > 100) {
    errors.codeName = "코드명은 100자 이하로 입력해 주세요.";
  }
  if (description && description.length > 500) {
    errors.description = "설명은 500자 이하로 입력해 주세요.";
  }
  if (sortOrder === null) errors.sortOrder = "정렬 순서는 0 이상의 정수로 입력해 주세요.";

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "입력한 내용을 다시 확인해 주세요.", errors };
  }

  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) return { status: "error", message: authorizationError ?? "권한을 확인해 주세요." };

  const values = {
    code_group_seq: codeGroupSeq as number,
    code,
    code_name: codeName,
    description,
    sort_order: sortOrder as number,
    is_active: isActive,
  };
  const { error } = seq
    ? await supabase.from("code_details").update(values).eq("seq", seq)
    : await supabase.from("code_details").insert(values);

  if (error) {
    console.error("Failed to save code detail", { code: error.code });
    return mapMutationError(error.code);
  }

  revalidatePath(codesPath);
  revalidatePath("/", "layout");
  return { status: "success", message: seq ? "상세 코드를 수정했어요." : "상세 코드를 추가했어요." };
}

export async function toggleCodeGroup(
  _previousState: CodeActionState,
  formData: FormData,
): Promise<CodeActionState> {
  const seq = getPositiveInteger(formData, "seq");
  const isActive = getText(formData, "isActive") === "true";
  if (!seq) return { status: "error", message: "코드그룹을 선택해 주세요." };

  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) return { status: "error", message: authorizationError ?? "권한을 확인해 주세요." };
  const { error } = await supabase.from("code_groups").update({ is_active: isActive }).eq("seq", seq);
  if (error) return mapMutationError(error.code);
  revalidatePath(codesPath);
  revalidatePath("/", "layout");
  return { status: "success", message: isActive ? "코드그룹을 활성화했어요." : "코드그룹을 비활성화했어요." };
}

export async function toggleCodeDetail(
  _previousState: CodeActionState,
  formData: FormData,
): Promise<CodeActionState> {
  const seq = getPositiveInteger(formData, "seq");
  const isActive = getText(formData, "isActive") === "true";
  if (!seq) return { status: "error", message: "상세 코드를 선택해 주세요." };

  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) return { status: "error", message: authorizationError ?? "권한을 확인해 주세요." };
  const { error } = await supabase.from("code_details").update({ is_active: isActive }).eq("seq", seq);
  if (error) return mapMutationError(error.code);
  revalidatePath(codesPath);
  revalidatePath("/", "layout");
  return { status: "success", message: isActive ? "상세 코드를 활성화했어요." : "상세 코드를 비활성화했어요." };
}

export async function deleteCodeGroup(
  _previousState: CodeActionState,
  formData: FormData,
): Promise<CodeActionState> {
  const seq = getPositiveInteger(formData, "seq");
  if (!seq) return { status: "error", message: "삭제할 코드그룹을 확인해 주세요." };

  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) return { status: "error", message: authorizationError ?? "권한을 확인해 주세요." };
  const { error } = await supabase.from("code_groups").delete().eq("seq", seq);
  if (error) return mapMutationError(error.code, true);
  revalidatePath(codesPath);
  revalidatePath("/", "layout");
  return { status: "success", message: "코드그룹을 삭제했어요." };
}

export async function deleteCodeDetail(
  _previousState: CodeActionState,
  formData: FormData,
): Promise<CodeActionState> {
  const seq = getPositiveInteger(formData, "seq");
  if (!seq) return { status: "error", message: "삭제할 상세 코드를 확인해 주세요." };

  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) return { status: "error", message: authorizationError ?? "권한을 확인해 주세요." };
  const { error } = await supabase.from("code_details").delete().eq("seq", seq);
  if (error) return mapMutationError(error.code);
  revalidatePath(codesPath);
  revalidatePath("/", "layout");
  return { status: "success", message: "상세 코드를 삭제했어요." };
}
