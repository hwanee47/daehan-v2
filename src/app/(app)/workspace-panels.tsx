"use client";

import { RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Container } from "@/components/layout/container";
import { WorkspaceBreadcrumb } from "@/components/layout/workspace-breadcrumb";
import { Button } from "@/components/ui/button";
import { SearchConditions } from "@/components/ui/search-conditions";
import type { AppTabHref } from "@/lib/app-tabs";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

import { InspectionReportManagement } from "./inspection-reports/inspection-report-management";
import { InspectionMeasurementSheet } from "./inspection-measurements/inspection-measurement-sheet";
import { InspectionMeasurementHistory } from "./inspection-measurement-history/inspection-measurement-history";
import { CodeManagement } from "./master/codes/code-management";
import { ItemManagement } from "./master/items/item-management";
import { ToleranceRangeManagement } from "./master/tolerance-ranges/tolerance-range-management";
import {
  loadCodesWorkspace,
  loadInspectionHistoryWorkspace,
  loadInspectionMeasurementsWorkspace,
  loadInspectionReportsWorkspace,
  searchItemsWorkspace,
  searchToleranceWorkspace,
} from "./workspace-data-actions";
import type {
  CodesWorkspaceResult,
  InspectionHistoryWorkspaceResult,
  InspectionMeasurementsWorkspaceResult,
  InspectionReportsWorkspaceResult,
  ItemsWorkspaceResult,
  ToleranceWorkspaceResult,
  WorkspaceSearchFilters,
} from "./workspace-data-actions";

const inputClassName = "h-12 w-full rounded-sm border border-input bg-background px-4 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60";
const emptyFilters: WorkspaceSearchFilters = { itemCode: "", itemDetailCode: "", itemName: "", modelName: "" };

function WorkspaceSearch({ idPrefix, includeItemDetailCode = false, onApply, pending }: { idPrefix: string; includeItemDetailCode?: boolean; onApply: (filters: WorkspaceSearchFilters) => void; pending: boolean }) {
  const [draft, setDraft] = useState<WorkspaceSearchFilters>(emptyFilters);
  return (
    <SearchConditions>
    <form aria-busy={pending} className="p-4 @min-[640px]/workspace:p-6" onSubmit={(event) => { event.preventDefault(); onApply({ itemCode: draft.itemCode.trim(), itemDetailCode: draft.itemDetailCode.trim(), itemName: draft.itemName.trim(), modelName: draft.modelName.trim() }); }}>
      <div className={`grid gap-4 @min-[768px]/workspace:grid-cols-2 ${includeItemDetailCode ? "@min-[1280px]/workspace:grid-cols-[repeat(4,minmax(0,1fr))_auto]" : "@min-[1024px]/workspace:grid-cols-[repeat(3,minmax(0,1fr))_auto]"}`}>
        {([ ["itemCode", "품목코드", "품목코드를 입력해 주세요"], ["itemName", "품목명", "품목명을 입력해 주세요"], ["modelName", "모델명", "모델명을 입력해 주세요"], ...(includeItemDetailCode ? [["itemDetailCode", "품목상세코드", "품목상세코드를 입력해 주세요"]] as const : []) ] as const).map(([key, label, placeholder]) => (
          <div className="space-y-2" key={key}>
            <label className="text-sm font-semibold" htmlFor={`${idPrefix}-${key}`}>{label}</label>
            <input className={inputClassName} disabled={pending} id={`${idPrefix}-${key}`} maxLength={100} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} value={draft[key]} />
          </div>
        ))}
        <div className="flex items-end gap-3 @min-[768px]/workspace:col-span-2 @min-[768px]/workspace:justify-end @min-[1024px]/workspace:col-span-1 @min-[1024px]/workspace:justify-start">
          <Button disabled={pending} onClick={() => { setDraft(emptyFilters); onApply(emptyFilters); }} type="button" variant="secondary"><RotateCcw aria-hidden="true" />초기화</Button>
          <Button disabled={pending} type="submit"><Search aria-hidden="true" />{pending ? "조회 중" : "조회"}</Button>
        </div>
      </div>
    </form>
    </SearchConditions>
  );
}

function LoadState({ message, pending }: { message: string; pending?: boolean }) {
  return <div aria-live="polite" className="mt-8 rounded-3xl border border-border bg-card p-6" role={pending ? "status" : "alert"}><h2 className="text-lg font-semibold">{message}</h2><p className="mt-2 text-muted-foreground">{pending ? "잠시만 기다려 주세요." : "잠시 후 다시 시도해 주세요."}</p></div>;
}

function useVisibleLoad<T>(isVisible: boolean, load: () => Promise<T>) {
  const [result, setResult] = useState<T | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const startedRef = useRef(false);
  useEffect(() => {
    if (!isVisible || startedRef.current) return;
    startedRef.current = true;
    void load()
      .then(setResult)
      .catch((error: unknown) => {
        console.error("Failed to load workspace panel", { message: error instanceof Error ? error.message : "Unknown error" });
        setLoadError("화면 데이터를 불러오지 못했어요");
      });
  }, [isVisible, load]);
  return { result, loadError, pending: isVisible && result === null && loadError === null, setResult };
}

function PanelFrame({ children, current, fillContainer = false, parent }: { children: React.ReactNode; current: string; fillContainer?: boolean; parent: string }) {
  return <main className={cn("@container/workspace bg-background", fillContainer ? "flex h-full min-h-0 flex-col overflow-hidden" : "min-h-svh")}><Container className={cn("py-5 @min-[640px]/workspace:py-6", fillContainer && "flex h-full min-h-0 flex-col")} size="full"><WorkspaceBreadcrumb current={current} parent={parent} /><section className={cn(fillContainer && "min-h-0 flex-1")}>{children}</section></Container></main>;
}

function InspectionReportsPanel({ isVisible }: { isVisible: boolean }) {
  const load = useCallback(() => loadInspectionReportsWorkspace(), []);
  const { result, loadError } = useVisibleLoad<InspectionReportsWorkspaceResult>(isVisible, load);
  return <PanelFrame current="성적서 관리" parent="검사성적서">{loadError ? <LoadState message={loadError} /> : !result ? <LoadState message="검사성적서를 불러오는 중이에요" pending /> : <InspectionReportManagement data={result.data} initialPage={result.page} />}</PanelFrame>;
}

function InspectionMeasurementsPanel({ isVisible }: { isVisible: boolean }) {
  const load = useCallback(() => loadInspectionMeasurementsWorkspace(), []);
  const { result, loadError, setResult } = useVisibleLoad<InspectionMeasurementsWorkspaceResult>(isVisible, load);
  const measurementTargetSeq = useUiStore((state) => state.measurementTargetSeq);
  const measurementTargetRequestId = useUiStore((state) => state.measurementTargetRequestId);
  const handledTargetRequestId = useRef(0);
  useEffect(() => {
    if (!isVisible || measurementTargetRequestId === 0 || handledTargetRequestId.current === measurementTargetRequestId) return;
    handledTargetRequestId.current = measurementTargetRequestId;
    if (!result) return;
    void load().then(setResult).catch((error: unknown) => {
      console.error("Failed to refresh measurement target", { message: error instanceof Error ? error.message : "Unknown error" });
    });
  }, [isVisible, load, measurementTargetRequestId, result, setResult]);
  return <PanelFrame current="결과 입력" fillContainer parent="검사성적서">{loadError ? <LoadState message={loadError} /> : !result ? <LoadState message="측정결과 입력 정보를 불러오는 중이에요" pending /> : <InspectionMeasurementSheet data={result.data} fillContainer initialRecentWorked={result.recentWorked} initialReportSeq={measurementTargetSeq ?? undefined} selectionRequestId={measurementTargetRequestId} showModeTabs={false} />}</PanelFrame>;
}

function InspectionHistoryPanel({ isVisible }: { isVisible: boolean }) {
  const load = useCallback(() => loadInspectionHistoryWorkspace(), []);
  const { result, loadError } = useVisibleLoad<InspectionHistoryWorkspaceResult>(isVisible, load);
  return <PanelFrame current="측정 이력" parent="검사성적서">{loadError ? <LoadState message={loadError} /> : !result ? <LoadState message="측정 이력을 불러오는 중이에요" pending /> : <InspectionMeasurementHistory data={result.data} initialHistory={result.history} />}</PanelFrame>;
}

function ItemsPanel({ isVisible }: { isVisible: boolean }) {
  const initialLoad = useCallback(() => searchItemsWorkspace(emptyFilters), []);
  const { result, loadError, pending, setResult } = useVisibleLoad<ItemsWorkspaceResult>(isVisible, initialLoad);
  const [appliedFilters, setAppliedFilters] = useState<WorkspaceSearchFilters>(emptyFilters);
  const [searchPending, startSearch] = useTransition();
  const search = useCallback((filters: WorkspaceSearchFilters) => startSearch(async () => { setAppliedFilters(filters); setResult(await searchItemsWorkspace(filters)); }), [setResult]);
  const refresh = useCallback(() => search(appliedFilters), [appliedFilters, search]);
  const hasFilters = Object.values(appliedFilters).some(Boolean);
  return <PanelFrame current="품목관리" parent="기준정보"><WorkspaceSearch idPrefix="workspace-items-search" includeItemDetailCode onApply={search} pending={pending || searchPending} />{loadError ? <LoadState message={loadError} /> : !result ? <LoadState message="품목을 불러오는 중이에요" pending /> : result.error ? <LoadState message={result.error} /> : <ItemManagement details={result.details} hasFilters={hasFilters} items={result.items} onDataChanged={refresh} />}</PanelFrame>;
}

function ToleranceRangesPanel({ isVisible }: { isVisible: boolean }) {
  const initialLoad = useCallback(() => searchToleranceWorkspace(emptyFilters), []);
  const { result, loadError, pending, setResult } = useVisibleLoad<ToleranceWorkspaceResult>(isVisible, initialLoad);
  const [appliedFilters, setAppliedFilters] = useState<WorkspaceSearchFilters>(emptyFilters);
  const [searchPending, startSearch] = useTransition();
  const search = useCallback((filters: WorkspaceSearchFilters) => startSearch(async () => { setAppliedFilters(filters); setResult(await searchToleranceWorkspace(filters)); }), [setResult]);
  const refresh = useCallback(() => search(appliedFilters), [appliedFilters, search]);
  const hasFilters = Object.values(appliedFilters).some(Boolean);
  return <PanelFrame current="오차범위관리" parent="기준정보"><WorkspaceSearch idPrefix="workspace-tolerance-search" onApply={search} pending={pending || searchPending} />{loadError ? <LoadState message={loadError} /> : !result ? <LoadState message="오차범위를 불러오는 중이에요" pending /> : result.error ? <LoadState message={result.error} /> : <ToleranceRangeManagement hasFilters={hasFilters} items={result.items} onDataChanged={refresh} ranges={result.ranges} />}</PanelFrame>;
}

function CodesPanel({ isVisible }: { isVisible: boolean }) {
  const load = useCallback(() => loadCodesWorkspace(), []);
  const { result, loadError, setResult } = useVisibleLoad<CodesWorkspaceResult>(isVisible, load);
  const [refreshPending, startRefresh] = useTransition();
  const refresh = useCallback(() => startRefresh(async () => setResult(await loadCodesWorkspace())), [setResult]);
  return <PanelFrame current="코드관리" parent="기준정보">{loadError ? <LoadState message={loadError} /> : !result ? <LoadState message="코드를 불러오는 중이에요" pending /> : result.error ? <LoadState message={result.error} /> : <div aria-busy={refreshPending}><CodeManagement details={result.details} groups={result.groups} onDataChanged={refresh} /></div>}</PanelFrame>;
}

export function WorkspacePanel({ href, isVisible }: { href: AppTabHref; isVisible: boolean }) {
  if (href === "/inspection-reports") return <InspectionReportsPanel isVisible={isVisible} />;
  if (href === "/inspection-measurements") return <InspectionMeasurementsPanel isVisible={isVisible} />;
  if (href === "/inspection-measurement-history") return <InspectionHistoryPanel isVisible={isVisible} />;
  if (href === "/master/items") return <ItemsPanel isVisible={isVisible} />;
  if (href === "/master/tolerance-ranges") return <ToleranceRangesPanel isVisible={isVisible} />;
  return <CodesPanel isVisible={isVisible} />;
}
