"use client";

import { Dialog } from "@base-ui/react/dialog";
import type {
  CellKeyDownEvent,
  ColDef,
  ICellRendererParams,
  RowClickedEvent,
  RowDoubleClickedEvent,
} from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { ChevronLeft, ChevronRight, Eye, RotateCcw, Search, X } from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { WorkspaceDialogPortal } from "@/components/ui/workspace-portal";
import {
  appGridSingleRowSelection,
  appGridTheme,
  syncSelectedGridRow,
} from "@/lib/ag-grid";

import { InspectionMeasurementSheet } from "../inspection-measurements/inspection-measurement-sheet";
import type {
  InspectionMeasurementRun,
  InspectionReportData,
} from "../inspection-reports/types";
import { getMeasurementHistoryDetail, searchMeasurementHistory, searchMeasurementItemGroups, searchMeasurementItemRuns } from "./actions";
import type { MeasurementHistoryDetail, MeasurementHistoryFilters, MeasurementHistoryPage, MeasurementHistorySearchField, MeasurementItemGroup, MeasurementItemGroupPage } from "./types";

const modules = [AllCommunityModule];
const emptyFilters = {
  dateFrom: "",
  dateTo: "",
  searchField: "" as MeasurementHistorySearchField,
  keyword: "",
};

type HistoryFilters = MeasurementHistoryFilters;
type FilterKey = keyof HistoryFilters;

const filterFields = [
  ["dateFrom", "시작일", "date"],
  ["dateTo", "종료일", "date"],
] as const satisfies readonly (readonly [FilterKey, string, "date"])[];
const emptyItemGroups: MeasurementItemGroupPage = { rows: [], total: 0, page: 1, pageSize: 50, error: null };

export function InspectionMeasurementHistory({ data, initialHistory }: { data: InspectionReportData; initialHistory: MeasurementHistoryPage }) {
  const [draft, setDraft] = useState<HistoryFilters>(emptyFilters);
  const [filters, setFilters] = useState<HistoryFilters>(emptyFilters);
  const [history, setHistory] = useState(initialHistory);
  const [viewMode, setViewMode] = useState<"runs" | "items">("runs");
  const [itemGroups, setItemGroups] = useState<MeasurementItemGroupPage>(emptyItemGroups);
  const [itemGroupsLoaded, setItemGroupsLoaded] = useState(false);
  const [selectedItemSeq, setSelectedItemSeq] = useState<number | null>(null);
  const [viewingItem, setViewingItem] = useState<MeasurementItemGroup | null>(null);
  const [itemRuns, setItemRuns] = useState<MeasurementHistoryPage | null>(null);
  const [selectedRunSeq, setSelectedRunSeq] = useState<number | null>(null);
  const [viewingRun, setViewingRun] = useState<InspectionMeasurementRun | null>(null);
  const [detail, setDetail] = useState<MeasurementHistoryDetail | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const [isDetailLoading, startDetailTransition] = useTransition();
  const rows = history.rows;

  const columns = useMemo<ColDef<InspectionMeasurementRun>[]>(
    () => [
      {
        field: "created_at",
        headerName: "저장일시",
        minWidth: 180,
        sort: "desc",
        valueFormatter: ({ value }) => new Date(String(value)).toLocaleString("ko-KR"),
      },
      { field: "model_name", headerName: "기종", minWidth: 140 },
      { field: "item_name", headerName: "품명", minWidth: 170 },
      { field: "item_detail_code", headerName: "품번/도번", minWidth: 170 },
      {
        field: "product_type_name",
        headerName: "제품구분",
        minWidth: 120,
        valueFormatter: ({ value }) => String(value ?? ""),
      },
      { field: "customer_name", flex: 1, headerName: "고객명", minWidth: 140 },
      {
        colId: "view",
        headerName: "성적서보기",
        minWidth: 130,
        maxWidth: 140,
        pinned: "right",
        sortable: false,
        cellRenderer: ({ data: run }: ICellRendererParams<InspectionMeasurementRun>) =>
          run ? (
            <div className="flex h-full items-center">
              <Button
                aria-label={`${run.run_no}회차 검사성적서 보기`}
                className="h-8"
                onClick={(event) => {
                  event.stopPropagation();
                  openRun(run);
                }}
                size="sm"
                variant="secondary"
              >
                <Eye aria-hidden="true" />
                보기
              </Button>
            </div>
          ) : null,
      },
    ],
    [],
  );

  const itemColumns = useMemo<ColDef<MeasurementItemGroup>[]>(
    () => [
      { field: "item_code", headerName: "품목코드", minWidth: 170 },
      { field: "item_name", flex: 1, headerName: "품명", minWidth: 190 },
      { field: "model_name", headerName: "기종", minWidth: 150 },
      { field: "item_detail_count", headerName: "품목상세 수", minWidth: 120, maxWidth: 140 },
      { field: "run_count", headerName: "검사 횟수", minWidth: 110, maxWidth: 130 },
      { field: "latest_created_at", headerName: "최근 검사일", minWidth: 180, valueFormatter: ({ value }) => new Date(String(value)).toLocaleString("ko-KR") },
      {
        colId: "item-view",
        headerName: "검사서보기",
        minWidth: 140,
        maxWidth: 150,
        pinned: "right",
        sortable: false,
        cellRenderer: ({ data: item }: ICellRendererParams<MeasurementItemGroup>) => item ? <div className="flex h-full items-center"><Button aria-label={`${item.item_name} 검사서 보기`} className="h-8" onClick={(event) => { event.stopPropagation(); openItem(item); }} size="sm" variant="secondary"><Eye aria-hidden="true" />검사서 보기</Button></div> : null,
      },
    ],
    [],
  );

  const itemRunColumns = useMemo<ColDef<InspectionMeasurementRun>[]>(
    () => [
      { field: "item_detail_code", headerName: "품목상세코드", minWidth: 180 },
      { field: "item_detail_name", flex: 1, headerName: "품목상세명", minWidth: 180, valueFormatter: ({ value }) => String(value ?? "") },
      { field: "created_at", headerName: "저장일시", minWidth: 180, valueFormatter: ({ value }) => new Date(String(value)).toLocaleString("ko-KR") },
      { field: "product_type_name", headerName: "제품구분", minWidth: 120, valueFormatter: ({ value }) => String(value ?? "") },
      { field: "customer_name", headerName: "고객명", minWidth: 140, valueFormatter: ({ value }) => String(value ?? "") },
      { colId: "view", headerName: "성적서보기", minWidth: 130, maxWidth: 140, pinned: "right", sortable: false, cellRenderer: ({ data: run }: ICellRendererParams<InspectionMeasurementRun>) => run ? <div className="flex h-full items-center"><Button className="h-8" onClick={(event) => { event.stopPropagation(); setViewingItem(null); openRun(run); }} size="sm" variant="secondary"><Eye aria-hidden="true" />보기</Button></div> : null },
    ],
    [],
  );

  function openRun(run: InspectionMeasurementRun | undefined) {
    if (!run) return;
    setSelectedRunSeq(run.seq);
    setViewingRun(run);
    setDetail(null);
    startDetailTransition(async () => setDetail(await getMeasurementHistoryDetail(run.seq)));
  }

  function openItem(item: MeasurementItemGroup | undefined) {
    if (!item) return;
    setSelectedItemSeq(item.item_seq);
    setViewingItem(item);
    setItemRuns(null);
    startDetailTransition(async () => setItemRuns(await searchMeasurementItemRuns(item.item_seq, 1)));
  }

  function loadItemRuns(page: number) {
    if (!viewingItem) return;
    startDetailTransition(async () => setItemRuns(await searchMeasurementItemRuns(viewingItem.item_seq, page)));
  }

  function loadHistory(nextFilters: HistoryFilters, page: number) {
    startSearchTransition(async () => {
      const result = await searchMeasurementHistory({ ...nextFilters, page });
      setHistory(result);
      setSelectedRunSeq(null);
    });
  }

  function loadItemGroups(nextFilters: HistoryFilters, page: number) {
    startSearchTransition(async () => {
      const result = await searchMeasurementItemGroups({ ...nextFilters, page });
      setItemGroups(result);
      setItemGroupsLoaded(true);
      setSelectedItemSeq(null);
    });
  }

  function changeViewMode(mode: "runs" | "items") {
    setViewMode(mode);
    if (mode === "items" && !itemGroupsLoaded) loadItemGroups(filters, 1);
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters(draft);
    if (viewMode === "runs") loadHistory(draft, 1);
    else loadItemGroups(draft, 1);
  }

  function resetFilters() {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
    if (viewMode === "runs") loadHistory(emptyFilters, 1);
    else loadItemGroups(emptyFilters, 1);
  }

  if (data.hasError) {
    return (
      <div className="border-y border-border p-10 text-center" role="alert">
        <h2 className="font-semibold">측정 이력을 불러오지 못했어요</h2>
        <p className="mt-2 text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[620px] min-w-0 flex-col gap-4 @min-[1024px]/workspace:h-[calc(100svh-190px)] @min-[1024px]/workspace:min-h-0">
      <div aria-label="측정 이력 보기 방식" className="flex shrink-0 border-b border-border" role="tablist">
        <button aria-selected={viewMode === "runs"} className={`min-h-11 border-b-2 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring ${viewMode === "runs" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`} onClick={() => changeViewMode("runs")} role="tab" type="button">검사서별</button>
        <button aria-selected={viewMode === "items"} className={`min-h-11 border-b-2 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring ${viewMode === "items" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`} onClick={() => changeViewMode("items")} role="tab" type="button">품목별</button>
      </div>
      <form
        className="min-w-0 overflow-x-auto border-y border-border bg-background p-4"
        onSubmit={submitFilters}
      >
        <div className="flex w-full min-w-[1040px] flex-nowrap items-end gap-3">
          {filterFields.map(([key, label, type]) => (
            <label className="grid w-44 shrink-0 gap-1.5 text-sm font-medium" key={key}>
              <span>{label}</span>
              <input
                className="h-10 min-w-0 rounded-sm border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                type={type}
                value={draft[key]}
              />
            </label>
          ))}
          <label className="grid w-48 shrink-0 gap-1.5 text-sm font-medium">
            <span>검색 유형</span>
            <Select
              aria-label="검색 유형"
              onValueChange={(value) => setDraft((current) => ({ ...current, searchField: value as MeasurementHistorySearchField, keyword: value ? current.keyword : "" }))}
              options={[
                { label: "선택", value: "" },
                { label: "기종", value: "model" },
                { label: "품번/도번", value: "drawing" },
                { label: "품명", value: "itemName" },
                { label: "고객명", value: "customer" },
              ]}
              value={draft.searchField}
            />
          </label>
          <label className="grid min-w-72 flex-1 gap-1.5 text-sm font-medium">
            <span>검색어</span>
            <input
              className="h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50"
              disabled={!draft.searchField}
              onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))}
              placeholder="검색어를 입력해 주세요"
              type="search"
              value={draft.keyword}
            />
          </label>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button disabled={isSearching} type="submit">
              <Search aria-hidden="true" />
              {isSearching ? "조회 중..." : "조회"}
            </Button>
            <Button disabled={isSearching} onClick={resetFilters} type="button" variant="secondary">
              <RotateCcw aria-hidden="true" />
              초기화
            </Button>
          </div>
        </div>
      </form>

      {viewMode === "runs" ? <section aria-labelledby="measurement-history-grid-title" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-y border-border">
        <div className="flex items-center justify-between bg-muted/70 px-4 py-3">
          <h2 className="font-semibold" id="measurement-history-grid-title">측정 이력</h2>
          <span className="text-xs text-muted-foreground" aria-live="polite">총 {history.total}건 · {history.page}페이지</span>
        </div>
        <div className="min-h-[440px] min-w-0 flex-1 overflow-x-auto">
          {history.error ? (
            <p className="py-20 text-center text-sm text-destructive" role="alert">{history.error}</p>
          ) : rows.length ? (
            <div className="h-full min-w-[1100px]">
              <AgGridProvider modules={modules}>
                <AgGridReact
                  columnDefs={columns}
                  defaultColDef={{ resizable: true, sortable: true }}
                  getRowId={({ data: run }) => String(run.seq)}
                  onCellKeyDown={(event: CellKeyDownEvent<InspectionMeasurementRun>) => {
                    if (event.event instanceof KeyboardEvent && event.event.key === "Enter") openRun(event.data);
                  }}
                  onRowClicked={(event: RowClickedEvent<InspectionMeasurementRun>) => setSelectedRunSeq(event.data?.seq ?? null)}
                  onRowDataUpdated={({ api }) => syncSelectedGridRow(api, selectedRunSeq)}
                  onRowDoubleClicked={(event: RowDoubleClickedEvent<InspectionMeasurementRun>) => openRun(event.data)}
                  rowData={rows}
                  rowSelection={appGridSingleRowSelection}
                  theme={appGridTheme}
                />
              </AgGridProvider>
            </div>
          ) : <p className="py-20 text-center text-sm text-muted-foreground">조회조건에 맞는 측정 이력이 없어요.</p>}
        </div>
        <div className="flex min-h-14 items-center justify-end gap-2 border-t border-border px-4">
          <Button aria-label="이전 페이지" disabled={isSearching || history.page <= 1} onClick={() => loadHistory(filters, history.page - 1)} size="sm" type="button" variant="secondary"><ChevronLeft aria-hidden="true" />이전</Button>
          <Button aria-label="다음 페이지" disabled={isSearching || history.page * history.pageSize >= history.total} onClick={() => loadHistory(filters, history.page + 1)} size="sm" type="button" variant="secondary">다음<ChevronRight aria-hidden="true" /></Button>
        </div>
      </section> : <section aria-labelledby="measurement-item-grid-title" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-y border-border">
        <div className="flex items-center justify-between bg-muted/70 px-4 py-3">
          <h2 className="font-semibold" id="measurement-item-grid-title">품목별 측정 이력</h2>
          <span aria-live="polite" className="text-xs text-muted-foreground">총 {itemGroups.total}개 품목 · {itemGroups.page}페이지</span>
        </div>
        <div className="min-h-[440px] min-w-0 flex-1 overflow-x-auto">
          {itemGroups.error ? <p className="py-20 text-center text-sm text-destructive" role="alert">{itemGroups.error}</p> : itemGroups.rows.length ? <div className="h-full min-w-[1050px]"><AgGridProvider modules={modules}><AgGridReact columnDefs={itemColumns} defaultColDef={{ resizable: true, sortable: true }} getRowId={({ data: item }) => String(item.item_seq)} onCellKeyDown={(event: CellKeyDownEvent<MeasurementItemGroup>) => { if (event.event instanceof KeyboardEvent && event.event.key === "Enter") openItem(event.data); }} onRowClicked={(event: RowClickedEvent<MeasurementItemGroup>) => setSelectedItemSeq(event.data?.item_seq ?? null)} onRowDataUpdated={({ api }) => syncSelectedGridRow(api, selectedItemSeq)} onRowDoubleClicked={(event: RowDoubleClickedEvent<MeasurementItemGroup>) => openItem(event.data)} rowData={itemGroups.rows} rowSelection={appGridSingleRowSelection} theme={appGridTheme} /></AgGridProvider></div> : <p className="py-20 text-center text-sm text-muted-foreground">조회조건에 맞는 품목별 측정 이력이 없어요.</p>}
        </div>
        <div className="flex min-h-14 items-center justify-end gap-2 border-t border-border px-4">
          <Button disabled={isSearching || itemGroups.page <= 1} onClick={() => loadItemGroups(filters, itemGroups.page - 1)} size="sm" type="button" variant="secondary"><ChevronLeft aria-hidden="true" />이전</Button>
          <Button disabled={isSearching || itemGroups.page * itemGroups.pageSize >= itemGroups.total} onClick={() => loadItemGroups(filters, itemGroups.page + 1)} size="sm" type="button" variant="secondary">다음<ChevronRight aria-hidden="true" /></Button>
        </div>
      </section>}

      <Dialog.Root open={viewingItem !== null} onOpenChange={(open) => { if (!open) setViewingItem(null); }}>
        <WorkspaceDialogPortal>
          <Dialog.Backdrop className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px]" />
          <Dialog.Viewport className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-5">
            <Dialog.Popup className="flex h-[min(820px,calc(100svh-1rem))] w-full max-w-[1280px] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-xl outline-none sm:h-[min(820px,calc(100svh-2.5rem))]">
              <div className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-5">
                <div className="min-w-0"><Dialog.Title className="truncate text-lg font-semibold">{viewingItem ? `${viewingItem.item_code} · ${viewingItem.item_name}` : "품목 검사서"}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">품목에 속한 모든 품목상세의 측정 검사서를 조회해요.</Dialog.Description></div>
                <Dialog.Close aria-label="품목 검사서 닫기" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-accent"><X aria-hidden="true" /></Dialog.Close>
              </div>
              <div className="min-h-0 flex-1 overflow-x-auto">
                {isDetailLoading ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">품목 검사서를 불러오는 중이에요.</div> : itemRuns?.error ? <div className="flex h-full items-center justify-center text-sm text-destructive" role="alert">{itemRuns.error}</div> : itemRuns?.rows.length ? <div className="h-full min-w-[1050px]"><AgGridProvider modules={modules}><AgGridReact columnDefs={itemRunColumns} defaultColDef={{ resizable: true, sortable: true }} getRowId={({ data: run }) => String(run.seq)} onCellKeyDown={(event: CellKeyDownEvent<InspectionMeasurementRun>) => { if (event.event instanceof KeyboardEvent && event.event.key === "Enter") { setViewingItem(null); openRun(event.data); } }} onRowDoubleClicked={(event: RowDoubleClickedEvent<InspectionMeasurementRun>) => { setViewingItem(null); openRun(event.data); }} rowData={itemRuns.rows} theme={appGridTheme} /></AgGridProvider></div> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">저장된 검사서가 없어요.</div>}
              </div>
              <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-t border-border px-4"><span className="text-xs text-muted-foreground">총 {itemRuns?.total ?? 0}건</span><div className="flex gap-2"><Button disabled={isDetailLoading || !itemRuns || itemRuns.page <= 1} onClick={() => loadItemRuns((itemRuns?.page ?? 1) - 1)} size="sm" type="button" variant="secondary"><ChevronLeft aria-hidden="true" />이전</Button><Button disabled={isDetailLoading || !itemRuns || itemRuns.page * itemRuns.pageSize >= itemRuns.total} onClick={() => loadItemRuns((itemRuns?.page ?? 1) + 1)} size="sm" type="button" variant="secondary">다음<ChevronRight aria-hidden="true" /></Button></div></div>
            </Dialog.Popup>
          </Dialog.Viewport>
        </WorkspaceDialogPortal>
      </Dialog.Root>

      <Dialog.Root open={viewingRun !== null} onOpenChange={(open) => { if (!open) setViewingRun(null); }}>
        <WorkspaceDialogPortal>
          <Dialog.Backdrop className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px]" />
          <Dialog.Viewport className="fixed inset-0 z-[70] p-2 sm:p-5">
            <Dialog.Popup className="@container/workspace relative mx-auto h-full w-full max-w-[1360px] overflow-hidden rounded-3xl border border-border bg-background p-3 shadow-xl outline-none sm:p-5">
              <Dialog.Title className="sr-only">측정 이력 검사성적서 보기</Dialog.Title>
              <Dialog.Description className="sr-only">선택한 측정 회차의 검사성적서를 읽기 전용으로 보여줘요.</Dialog.Description>
              <Dialog.Close aria-label="성적서 보기 닫기" className="inspection-print-hide fixed right-4 top-4 z-[90] inline-flex size-11 items-center justify-center rounded-full bg-background shadow-lg sm:right-7 sm:top-7">
                <X aria-hidden="true" />
              </Dialog.Close>
              {isDetailLoading ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">성적서를 불러오는 중이에요.</div> : detail?.error ? <div className="flex h-full items-center justify-center text-sm text-destructive" role="alert">{detail.error}</div> : viewingRun && detail?.run ? (
                <InspectionMeasurementSheet
                  data={{ ...data, measurementRuns: [detail.run], measurementRunItems: detail.items }}
                  fillContainer
                  floatingPrintButton
                  initialReportSeq={viewingRun.inspection_report_seq}
                  initialRunSeq={viewingRun.seq}
                  initialViewMode="history"
                  showHistorySelector={false}
                  showModeTabs={false}
                  showReportList={false}
                />
              ) : null}
            </Dialog.Popup>
          </Dialog.Viewport>
        </WorkspaceDialogPortal>
      </Dialog.Root>
    </div>
  );
}
