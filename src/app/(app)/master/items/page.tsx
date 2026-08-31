import type { Metadata } from "next";
import { RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { WorkspaceBreadcrumb } from "@/components/layout/workspace-breadcrumb";
import { Button, buttonVariants } from "@/components/ui/button";
import { SearchConditions } from "@/components/ui/search-conditions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { ItemManagement } from "./item-management";
import { attachItemImageUrls } from "./item-image-urls";
import type { Item, ItemDetail } from "./types";

export const metadata: Metadata = {
  title: "품목관리 | Daehan",
  description: "품목과 품목상세 정보를 관리해요.",
};

type ItemSearchParams = {
  itemCode?: string | string[];
  itemDetailCode?: string | string[];
  itemName?: string | string[];
  modelName?: string | string[];
};

function getSearchValue(value?: string | string[]) {
  const text = Array.isArray(value) ? value[0] : value;
  return text?.trim().slice(0, 100) ?? "";
}

function escapeLikePattern(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export default async function ItemManagementPage({
  searchParams,
}: {
  searchParams: Promise<ItemSearchParams>;
}) {
  const query = await searchParams;
  const filters = {
    itemCode: getSearchValue(query.itemCode),
    itemDetailCode: getSearchValue(query.itemDetailCode),
    itemName: getSearchValue(query.itemName),
    modelName: getSearchValue(query.modelName),
  };
  const hasFilters = Object.values(filters).some(Boolean);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/");

  const matchingDetailsResult = filters.itemDetailCode
    ? await supabase
      .from("item_details")
      .select("seq, item_seq, item_detail_code, item_detail_name, image_path, material, note")
      .ilike("item_detail_code", `%${escapeLikePattern(filters.itemDetailCode)}%`)
      .order("seq")
    : null;
  const matchingItemSeqs = [...new Set((matchingDetailsResult?.data ?? []).map((detail) => detail.item_seq))];

  let itemsQuery = supabase
    .from("items")
    .select("seq, item_code, item_name, image_path, model_name, note")
    .order("seq");

  if (filters.itemCode) {
    itemsQuery = itemsQuery.ilike("item_code", `%${escapeLikePattern(filters.itemCode)}%`);
  }
  if (filters.itemName) {
    itemsQuery = itemsQuery.ilike("item_name", `%${escapeLikePattern(filters.itemName)}%`);
  }
  if (filters.modelName) {
    itemsQuery = itemsQuery.ilike("model_name", `%${escapeLikePattern(filters.modelName)}%`);
  }
  if (filters.itemDetailCode) {
    itemsQuery = matchingItemSeqs.length ? itemsQuery.in("seq", matchingItemSeqs) : itemsQuery.eq("seq", -1);
  }

  const itemsResult = await itemsQuery;
  const itemSeqs = (itemsResult.data ?? []).map((item) => item.seq);
  const detailsResult = filters.itemDetailCode
    ? { data: (matchingDetailsResult?.data ?? []).filter((detail) => itemSeqs.includes(detail.item_seq)), error: matchingDetailsResult?.error ?? null }
    : itemSeqs.length
    ? await supabase
      .from("item_details")
      .select("seq, item_seq, item_detail_code, item_detail_name, image_path, material, note")
      .in("item_seq", itemSeqs)
      .order("seq")
    : { data: [], error: null };

  const loadError = matchingDetailsResult?.error || itemsResult.error || detailsResult.error;
  if (loadError) console.error("Failed to load item management", { code: loadError.code });
  const itemImages = await attachItemImageUrls(
    supabase,
    (itemsResult.data ?? []) as Omit<Item, "image_url">[],
    (detailsResult.data ?? []) as Omit<ItemDetail, "image_url">[],
  );

  return (
    <main className="@container/workspace min-h-svh bg-background">
      <Container className="py-5 @min-[640px]/workspace:py-6" size="full">
        <WorkspaceBreadcrumb current="품목관리" parent="기준정보" />
        <section>
          <SearchConditions>
          <form className="p-4 @min-[640px]/workspace:p-6" method="get">
            <div className="grid gap-4 @min-[768px]/workspace:grid-cols-2 @min-[1280px]/workspace:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="search-item-code">품목코드</label>
                <input className="h-12 w-full rounded-sm border border-input bg-background px-4 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20" defaultValue={filters.itemCode} id="search-item-code" maxLength={100} name="itemCode" placeholder="품목코드를 입력해 주세요" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="search-item-name">품목명</label>
                <input className="h-12 w-full rounded-sm border border-input bg-background px-4 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20" defaultValue={filters.itemName} id="search-item-name" maxLength={100} name="itemName" placeholder="품목명을 입력해 주세요" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="search-model-name">모델명</label>
                <input className="h-12 w-full rounded-sm border border-input bg-background px-4 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20" defaultValue={filters.modelName} id="search-model-name" maxLength={100} name="modelName" placeholder="모델명을 입력해 주세요" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="search-item-detail-code">품목상세코드</label>
                <input className="h-12 w-full rounded-sm border border-input bg-background px-4 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20" defaultValue={filters.itemDetailCode} id="search-item-detail-code" maxLength={100} name="itemDetailCode" placeholder="품목상세코드를 입력해 주세요" />
              </div>
              <div className="flex items-end gap-3 @min-[768px]/workspace:col-span-2 @min-[768px]/workspace:justify-end @min-[1024px]/workspace:col-span-1 @min-[1024px]/workspace:justify-start">
                <Link className={cn(buttonVariants({ variant: "secondary" }))} href="/master/items">
                  <RotateCcw aria-hidden="true" />초기화
                </Link>
                <Button type="submit"><Search aria-hidden="true" />조회</Button>
              </div>
            </div>
          </form>
          </SearchConditions>

          {loadError ? (
            <div className="mt-8 rounded-3xl border border-border bg-card p-6" role="alert">
              <h2 className="text-lg font-semibold">품목을 불러오지 못했어요</h2>
              <p className="mt-2 text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
            </div>
          ) : (
            <ItemManagement
              details={itemImages.details}
              hasFilters={hasFilters}
              items={itemImages.items}
            />
          )}
        </section>
      </Container>
    </main>
  );
}
