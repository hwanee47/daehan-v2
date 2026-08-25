import type { Metadata } from "next";
import { RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { ItemManagement } from "./item-management";
import type { Item, ItemDetail } from "./types";

export const metadata: Metadata = {
  title: "품목관리 | Daehan",
  description: "품목과 품목상세 정보를 관리해요.",
};

type ItemSearchParams = {
  itemCode?: string | string[];
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

  let itemsQuery = supabase
    .from("items")
    .select("seq, item_code, item_name, model_name, note")
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

  const itemsResult = await itemsQuery;
  const itemSeqs = (itemsResult.data ?? []).map((item) => item.seq);
  const detailsResult = itemSeqs.length
    ? await supabase
      .from("item_details")
      .select("seq, item_seq, item_detail_code, item_detail_name, material, note")
      .in("item_seq", itemSeqs)
      .order("seq")
    : { data: [], error: null };

  const loadError = itemsResult.error || detailsResult.error;
  if (loadError) console.error("Failed to load item management", { code: loadError.code });

  return (
    <main className="@container/workspace min-h-svh bg-background">
      <Container className="py-10 @min-[640px]/workspace:py-16" size="full">
        <section aria-labelledby="item-management-title">
          <h1 className="text-3xl font-semibold tracking-tight @min-[640px]/workspace:text-4xl" id="item-management-title">
            품목관리
          </h1>
          <p className="mt-3 text-muted-foreground">품목과 품목별 상세 정보를 관리할 수 있어요.</p>

          <form className="mt-8 rounded-3xl border border-border bg-card p-4 @min-[640px]/workspace:p-6" method="get">
            <div className="grid gap-4 @min-[768px]/workspace:grid-cols-2 @min-[1024px]/workspace:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
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
              <div className="flex items-end gap-3 @min-[768px]/workspace:col-span-2 @min-[768px]/workspace:justify-end @min-[1024px]/workspace:col-span-1 @min-[1024px]/workspace:justify-start">
                <Link className={cn(buttonVariants({ variant: "secondary" }))} href="/master/items">
                  <RotateCcw aria-hidden="true" />초기화
                </Link>
                <Button type="submit"><Search aria-hidden="true" />조회</Button>
              </div>
            </div>
          </form>

          {loadError ? (
            <div className="mt-8 rounded-3xl border border-border bg-card p-6" role="alert">
              <h2 className="text-lg font-semibold">품목을 불러오지 못했어요</h2>
              <p className="mt-2 text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
            </div>
          ) : (
            <ItemManagement
              details={(detailsResult.data ?? []) as ItemDetail[]}
              hasFilters={hasFilters}
              items={(itemsResult.data ?? []) as Item[]}
            />
          )}
        </section>
      </Container>
    </main>
  );
}
