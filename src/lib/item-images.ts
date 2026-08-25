export const itemImageBucket = "item-images";
export const itemImageMaxBytes = 5 * 1024 * 1024;
export const itemImageAccept = "image/jpeg,image/png,image/webp";

export const itemImageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ItemImageEntity = "item" | "itemDetail";

export function isItemImageEntity(value: unknown): value is ItemImageEntity {
  return value === "item" || value === "itemDetail";
}
