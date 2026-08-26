"use client";

import { RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Container } from "@/components/layout/container";
import { WorkspaceBreadcrumb } from "@/components/layout/workspace-breadcrumb";
import { Button } from "@/components/ui/button";

import { InspectionReportManagement } from "./inspection-reports/inspection-report-management";
import type { InspectionReportData } from "./inspection-reports/types";
import { InspectionMeasurementSheet } from "./inspection-measurements/inspection-measurement-sheet";
import { CodeManagement } from "./master/codes/code-management";
import type { CodeDetail, CodeGroup } from "./master/codes/types";
import { ItemManagement } from "./master/items/item-management";
import type { Item, ItemDetail } from "./master/items/types";
import { ToleranceRangeManagement } from "./master/tolerance-ranges/tolerance-range-management";
import type {
  ItemToleranceRange,
  ToleranceItem,
} from "./master/tolerance-ranges/types";

const inputClassName =
  "h-12 w-full rounded-sm border border-input bg-background px-4 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20";

type SearchFilters = {
  itemCode: string;
  itemName: string;
  modelName: string;
};

const emptyFilters: SearchFilters = { itemCode: "", itemName: "", modelName: "" };

function matchesFilters(
  item: { item_code: string; item_name: string; model_name: string | null },
  filters: SearchFilters,
) {
  return (
    item.item_code.toLocaleLowerCase().includes(filters.itemCode.toLocaleLowerCase()) &&
    item.item_name.toLocaleLowerCase().includes(filters.itemName.toLocaleLowerCase()) &&
    (item.model_name ?? "").toLocaleLowerCase().includes(filters.modelName.toLocaleLowerCase())
  );
}

function WorkspaceSearch({
  idPrefix,
  onApply,
}: {
  idPrefix: string;
  onApply: (filters: SearchFilters) => void;
}) {
  const [draft, setDraft] = useState<SearchFilters>(emptyFilters);

  return (
    <form
      className="rounded-3xl border border-border bg-card p-4 @min-[640px]/workspace:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        onApply({
          itemCode: draft.itemCode.trim(),
          itemName: draft.itemName.trim(),
          modelName: draft.modelName.trim(),
        });
      }}
    >
      <div className="grid gap-4 @min-[768px]/workspace:grid-cols-2 @min-[1024px]/workspace:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
        {(
          [
            ["itemCode", "품목코드", "품목코드를 입력해 주세요"],
            ["itemName", "품목명", "품목명을 입력해 주세요"],
            ["modelName", "모델명", "모델명을 입력해 주세요"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <div className="space-y-2" key={key}>
            <label className="text-sm font-semibold" htmlFor={`${idPrefix}-${key}`}>
              {label}
            </label>
            <input
              className={inputClassName}
              id={`${idPrefix}-${key}`}
              maxLength={100}
              onChange={(event) =>
                setDraft((current) => ({ ...current, [key]: event.target.value }))
              }
              placeholder={placeholder}
              value={draft[key]}
            />
          </div>
        ))}
        <div className="flex items-end gap-3 @min-[768px]/workspace:col-span-2 @min-[768px]/workspace:justify-end @min-[1024px]/workspace:col-span-1 @min-[1024px]/workspace:justify-start">
          <Button
            onClick={() => {
              setDraft(emptyFilters);
              onApply(emptyFilters);
            }}
            type="button"
            variant="secondary"
          >
            <RotateCcw aria-hidden="true" />초기화
          </Button>
          <Button type="submit"><Search aria-hidden="true" />조회</Button>
        </div>
      </div>
    </form>
  );
}

function LoadError({ flush = false, message }: { flush?: boolean; message: string }) {
  return (
    <div className={`${flush ? "" : "mt-8 "}rounded-3xl border border-border bg-card p-6`} role="alert">
      <h2 className="text-lg font-semibold">{message}</h2>
      <p className="mt-2 text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
    </div>
  );
}

export function InspectionReportsWorkspacePanel({ data }: { data: InspectionReportData }) {
  return (
    <main className="@container/workspace min-h-svh">
      <Container className="py-5 @min-[640px]/workspace:py-6" size="full">
        <WorkspaceBreadcrumb current="성적서 관리" parent="검사성적서" />
        <section>
          <InspectionReportManagement data={data} />
        </section>
      </Container>
    </main>
  );
}

export function InspectionMeasurementsWorkspacePanel({ data }: { data: InspectionReportData }) {
  return <main className="@container/workspace min-h-svh bg-background"><Container className="py-5 @min-[640px]/workspace:py-6" size="full"><WorkspaceBreadcrumb current="측정결과 입력" parent="검사성적서" /><section><InspectionMeasurementSheet data={data} /></section></Container></main>;
}

export function ItemsWorkspacePanel({
  details,
  hasError,
  items,
}: {
  details: ItemDetail[];
  hasError: boolean;
  items: Item[];
}) {
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const visibleItems = useMemo(
    () => items.filter((item) => matchesFilters(item, filters)),
    [filters, items],
  );
  const visibleItemSeqs = useMemo(
    () => new Set(visibleItems.map((item) => item.seq)),
    [visibleItems],
  );
  const visibleDetails = useMemo(
    () => details.filter((detail) => visibleItemSeqs.has(detail.item_seq)),
    [details, visibleItemSeqs],
  );
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <main className="@container/workspace min-h-svh bg-background">
      <Container className="py-5 @min-[640px]/workspace:py-6" size="full">
        <WorkspaceBreadcrumb current="품목관리" parent="기준정보" />
        <section>
          <WorkspaceSearch idPrefix="workspace-items-search" onApply={setFilters} />
          {hasError ? <LoadError message="품목을 불러오지 못했어요" /> : (
            <ItemManagement details={visibleDetails} hasFilters={hasFilters} items={visibleItems} />
          )}
        </section>
      </Container>
    </main>
  );
}

export function ToleranceRangesWorkspacePanel({
  hasError,
  items,
  ranges,
}: {
  hasError: boolean;
  items: ToleranceItem[];
  ranges: ItemToleranceRange[];
}) {
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const visibleItems = useMemo(
    () => items.filter((item) => matchesFilters(item, filters)),
    [filters, items],
  );
  const visibleItemSeqs = useMemo(
    () => new Set(visibleItems.map((item) => item.seq)),
    [visibleItems],
  );
  const visibleRanges = useMemo(
    () => ranges.filter((range) => visibleItemSeqs.has(range.item_seq)),
    [ranges, visibleItemSeqs],
  );

  return (
    <main className="@container/workspace min-h-svh bg-background">
      <Container className="py-5 @min-[640px]/workspace:py-6" size="full">
        <WorkspaceBreadcrumb current="오차범위관리" parent="기준정보" />
        <section>
          <WorkspaceSearch idPrefix="workspace-tolerance-search" onApply={setFilters} />
          {hasError ? <LoadError message="오차범위를 불러오지 못했어요" /> : (
            <ToleranceRangeManagement
              hasFilters={Object.values(filters).some(Boolean)}
              items={visibleItems}
              ranges={visibleRanges}
            />
          )}
        </section>
      </Container>
    </main>
  );
}

export function CodesWorkspacePanel({
  details,
  groups,
  hasError,
}: {
  details: CodeDetail[];
  groups: CodeGroup[];
  hasError: boolean;
}) {
  return (
    <main className="@container/workspace min-h-svh bg-background">
      <Container className="py-5 @min-[640px]/workspace:py-6" size="full">
        <WorkspaceBreadcrumb current="코드관리" parent="기준정보" />
        <section>
          {hasError ? <LoadError flush message="코드를 불러오지 못했어요" /> : (
            <CodeManagement details={details} groups={groups} />
          )}
        </section>
      </Container>
    </main>
  );
}
