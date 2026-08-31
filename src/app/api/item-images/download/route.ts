import { NextResponse } from "next/server";

import { isItemImageEntity, itemImageBucket, type ItemImageEntity } from "@/lib/item-images";
import { createClient } from "@/lib/supabase/server";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function parseSeq(value: string | null) {
  const seq = Number(value);
  return Number.isSafeInteger(seq) && seq > 0 ? seq : null;
}

function safeFileName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 120) || "item-image";
}

async function getImageRecord(entity: ItemImageEntity, seq: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: errorResponse("로그인이 필요해요.", 401), record: null, supabase: null };

  const { data: profile, error: profileError } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin") return { error: errorResponse("관리자만 이미지를 다운로드할 수 있어요.", 403), record: null, supabase: null };

  const result = entity === "item"
    ? await supabase.from("items").select("item_code, image_path").eq("seq", seq).maybeSingle()
    : await supabase.from("item_details").select("item_detail_code, image_path").eq("seq", seq).maybeSingle();
  if (result.error || !result.data) return { error: errorResponse("이미지를 연결한 품목 정보를 찾지 못했어요.", 404), record: null, supabase: null };

  const code = "item_code" in result.data ? result.data.item_code : result.data.item_detail_code;
  return { error: null, record: { code, imagePath: result.data.image_path }, supabase };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entity = url.searchParams.get("entity");
  const seq = parseSeq(url.searchParams.get("seq"));
  if (!isItemImageEntity(entity) || !seq) return errorResponse("다운로드할 이미지 대상을 확인해 주세요.", 400);

  const { error, record, supabase } = await getImageRecord(entity, seq);
  if (error || !record || !supabase) return error ?? errorResponse("권한을 확인해 주세요.", 403);
  if (!record.imagePath) return errorResponse("등록된 이미지가 없어요.", 404);

  const { data: file, error: downloadError } = await supabase.storage.from(itemImageBucket).download(record.imagePath);
  if (downloadError || !file) {
    console.error("Failed to download item image", { code: downloadError?.name });
    return errorResponse("이미지를 다운로드하지 못했어요. 잠시 후 다시 시도해 주세요.", 500);
  }

  const extension = record.imagePath.split(".").at(-1)?.toLowerCase();
  const fileName = `${safeFileName(record.code)}.${extension === "jpeg" ? "jpg" : extension || "jpg"}`;
  return new Response(file, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="item-image.${extension || "jpg"}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Type": file.type || "application/octet-stream",
    },
  });
}
