import type { SupabaseClient } from "@supabase/supabase-js";

type UploadFileOptions = {
  bucket: string;
  path: string;
  file: File;
  upsert?: boolean;
};

export async function uploadFile(
  supabase: SupabaseClient,
  { bucket, path, file, upsert = false }: UploadFileOptions,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert });

  if (error) throw error;

  return data;
}

export async function removeFiles(
  supabase: SupabaseClient,
  bucket: string,
  paths: string[],
) {
  const { data, error } = await supabase.storage.from(bucket).remove(paths);

  if (error) throw error;

  return data;
}

export function getPublicFileUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

