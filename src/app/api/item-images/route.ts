import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  isItemImageEntity,
  itemImageBucket,
  itemImageExtensions,
  itemImageMaxBytes,
  type ItemImageEntity,
} from "@/lib/item-images";
import { createClient } from "@/lib/supabase/server";
import { removeFiles, uploadFile } from "@/lib/supabase/storage";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function parseSeq(value: unknown) {
  const seq = Number(value);
  return Number.isSafeInteger(seq) && seq > 0 ? seq : null;
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
    return { error: "관리자만 이미지를 변경할 수 있어요.", supabase: null };
  }

  return { error: null, supabase };
}

async function getCurrentImagePath(
  supabase: SupabaseClient,
  entity: ItemImageEntity,
  seq: number,
) {
  if (entity === "item") {
    return supabase.from("items").select("image_path").eq("seq", seq).maybeSingle();
  }

  return supabase.from("item_details").select("image_path").eq("seq", seq).maybeSingle();
}

async function setImagePath(
  supabase: SupabaseClient,
  entity: ItemImageEntity,
  seq: number,
  imagePath: string | null,
) {
  if (entity === "item") {
    return supabase.from("items").update({ image_path: imagePath }).eq("seq", seq);
  }

  return supabase.from("item_details").update({ image_path: imagePath }).eq("seq", seq);
}

function getObjectFolder(entity: ItemImageEntity) {
  return entity === "item" ? "items" : "item-details";
}

async function removeObject(supabase: SupabaseClient, path: string) {
  try {
    await removeFiles(supabase, itemImageBucket, [path]);
  } catch (error) {
    console.error("Failed to remove item image object", {
      message: error instanceof Error ? error.message : "Unknown storage error",
    });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("허용되지 않은 요청이에요.", 403);

  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) return errorResponse(authorizationError ?? "권한을 확인해 주세요.", 403);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("이미지 요청을 읽지 못했어요.", 400);
  }

  const entityValue = formData.get("entity");
  const seq = parseSeq(formData.get("seq"));
  const file = formData.get("file");

  if (!isItemImageEntity(entityValue) || !seq) {
    return errorResponse("이미지를 연결할 대상을 확인해 주세요.", 400);
  }
  if (!(file instanceof File) || file.size === 0) {
    return errorResponse("업로드할 이미지를 선택해 주세요.", 400);
  }
  if (file.size > itemImageMaxBytes) {
    return errorResponse("이미지는 5MB 이하만 업로드할 수 있어요.", 413);
  }

  const extension = itemImageExtensions[file.type as keyof typeof itemImageExtensions];
  if (!extension) {
    return errorResponse("JPEG, PNG, WebP 이미지만 업로드할 수 있어요.", 415);
  }

  const { data: record, error: recordError } = await getCurrentImagePath(
    supabase,
    entityValue,
    seq,
  );
  if (recordError || !record) {
    return errorResponse("이미지를 연결할 품목 정보를 찾지 못했어요.", 404);
  }

  const imagePath = `${getObjectFolder(entityValue)}/${seq}/${crypto.randomUUID()}.${extension}`;

  try {
    await uploadFile(supabase, {
      bucket: itemImageBucket,
      file,
      path: imagePath,
    });
  } catch (error) {
    console.error("Failed to upload item image", {
      message: error instanceof Error ? error.message : "Unknown storage error",
    });
    return errorResponse("이미지를 업로드하지 못했어요. 잠시 후 다시 시도해 주세요.", 500);
  }

  const { error: updateError } = await setImagePath(supabase, entityValue, seq, imagePath);
  if (updateError) {
    await removeObject(supabase, imagePath);
    console.error("Failed to connect item image", { code: updateError.code });
    return errorResponse("이미지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.", 500);
  }

  if (record.image_path) await removeObject(supabase, record.image_path);

  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from(itemImageBucket)
    .createSignedUrl(imagePath, 3600);

  if (signedUrlError) {
    console.error("Failed to create item image URL", { message: signedUrlError.message });
  }

  return NextResponse.json({
    imagePath,
    imageUrl: signedUrl?.signedUrl ?? null,
    message: record.image_path ? "이미지를 교체했어요." : "이미지를 등록했어요.",
  });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("허용되지 않은 요청이에요.", 403);

  const { error: authorizationError, supabase } = await getAdminClient();
  if (!supabase) return errorResponse(authorizationError ?? "권한을 확인해 주세요.", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("이미지 요청을 읽지 못했어요.", 400);
  }

  const entity = (body as { entity?: unknown })?.entity;
  const seq = parseSeq((body as { seq?: unknown })?.seq);
  if (!isItemImageEntity(entity) || !seq) {
    return errorResponse("삭제할 이미지 대상을 확인해 주세요.", 400);
  }

  const { data: record, error: recordError } = await getCurrentImagePath(supabase, entity, seq);
  if (recordError || !record) {
    return errorResponse("이미지를 연결한 품목 정보를 찾지 못했어요.", 404);
  }
  if (!record.image_path) {
    return NextResponse.json({ imagePath: null, imageUrl: null, message: "등록된 이미지가 없어요." });
  }

  const { error: updateError } = await setImagePath(supabase, entity, seq, null);
  if (updateError) {
    console.error("Failed to disconnect item image", { code: updateError.code });
    return errorResponse("이미지를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.", 500);
  }

  await removeObject(supabase, record.image_path);

  return NextResponse.json({ imagePath: null, imageUrl: null, message: "이미지를 삭제했어요." });
}
