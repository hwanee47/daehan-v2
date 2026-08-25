import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { itemImageBucket } from "@/lib/item-images";
import { createSignedFileUrls } from "@/lib/supabase/storage";

import type { Item, ItemDetail } from "./types";

type ItemWithoutUrl = Omit<Item, "image_url">;
type ItemDetailWithoutUrl = Omit<ItemDetail, "image_url">;

export async function attachItemImageUrls(
  supabase: SupabaseClient,
  items: ItemWithoutUrl[],
  details: ItemDetailWithoutUrl[],
) {
  let signedUrls = new Map<string, string>();

  try {
    signedUrls = await createSignedFileUrls(
      supabase,
      itemImageBucket,
      [
        ...items.map((item) => item.image_path),
        ...details.map((detail) => detail.image_path),
      ],
    );
  } catch (error) {
    console.error("Failed to create item image URLs", {
      message: error instanceof Error ? error.message : "Unknown storage error",
    });
  }

  return {
    details: details.map((detail): ItemDetail => ({
      ...detail,
      image_url: detail.image_path ? (signedUrls.get(detail.image_path) ?? null) : null,
    })),
    items: items.map((item): Item => ({
      ...item,
      image_url: item.image_path ? (signedUrls.get(item.image_path) ?? null) : null,
    })),
  };
}
