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

export async function createSignedFileUrls(
  supabase: SupabaseClient,
  bucket: string,
  paths: Array<string | null | undefined>,
  expiresIn = 3600,
) {
  const uniquePaths = Array.from(new Set(paths.filter((path): path is string => Boolean(path))));
  if (uniquePaths.length === 0) return new Map<string, string>();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(uniquePaths, expiresIn);

  if (error) throw error;

  return new Map(
    data.flatMap((file) =>
      file.path && file.signedUrl ? [[file.path, file.signedUrl] as const] : [],
    ),
  );
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
