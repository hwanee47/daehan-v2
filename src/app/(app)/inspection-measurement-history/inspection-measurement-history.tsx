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
import { SearchConditions } from "@/components/ui/search-conditions";
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
import { getMeasurementHistoryDetail, searchMeasurementHistory, searchMeasurementModelGroups, searchMeasurementModelReports, searchMeasurementReportRuns } from "./actions";
import type { MeasurementHistoryDetail, MeasurementHistoryFilters, MeasurementHistoryPage, MeasurementHistorySearchField, MeasurementModelGroup, MeasurementModelGroupPage, MeasurementModelReport, MeasurementModelReportPage } from "./types";

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
const emptyModelGroups: MeasurementModelGroupPage = { rows: [], total: 0, page: 1, pageSize: 50, error: null };
const emptyModelReports: MeasurementModelReportPage = { rows: [], total: 0, page: 1, pageSize: 50, error: null };

export function InspectionMeasurementHistory({ data, initialHistory }: { data: InspectionReportData; initialHistory: MeasurementHistoryPage }) {
  const [draft, setDraft] = useState<HistoryFilters>(emptyFilters);
  const [filters, setFilters] = useState<HistoryFilters>(emptyFilters);
  const [history, setHistory] = useState(initialHistory);
  const [viewMode, setViewMode] = useState<"runs" | "models">("runs");
  const [modelGroups, setModelGroups] = useState<MeasurementModelGroupPage>(emptyModelGroups);
  const [modelGroupsLoaded, setModelGroupsLoaded] = useState(false);
  const [selectedModelName, setSelectedModelName] = useState<string | null>(null);
  const [viewingModel, setViewingModel] = useState<MeasurementModelGroup | null>(null);
  const [modelReports, setModelReports] = useState<MeasurementModelReportPage>(emptyModelReports);
  const [selectedReportSeq, setSelectedReportSeq] = useState<number | null>(null);
  const [reportRuns, setReportRuns] = useState<MeasurementHistoryPage | null>(null);
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
      { field: "item_detail_name", headerName: "상세품명", minWidth: 170, valueFormatter: ({ value }) => String(value ?? "") },
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

  const modelColumns = useMemo<ColDef<MeasurementModelGroup>[]>(
    () => [
      { field: "model_name", flex: 1, headerName: "기종", minWidth: 220 },
      { field: "report_count", headerName: "검사서 수", minWidth: 110, maxWidth: 130 },
      { field: "run_count", headerName: "검사 횟수", minWidth: 110, maxWidth: 130 },
      { field: "latest_created_at", headerName: "최근 검사일", minWidth: 180, valueFormatter: ({ value }) => new Date(String(value)).toLocaleString("ko-KR") },
      {
        colId: "model-view",
        headerName: "검사서보기",
        minWidth: 140,
        maxWidth: 150,
        pinned: "right",
        sortable: false,
        cellRenderer: ({ data: model }: ICellRendererParams<MeasurementModelGroup>) => model ? <div className="flex h-full items-center"><Button aria-label={`${model.model_name} 검사서 보기`} className="h-8" onClick={(event) => { event.stopPropagation(); openModel(model); }} size="sm" variant="secondary"><Eye aria-hidden="true" />검사서 보기</Button></div> : null,
      },
    ],
    [],
  );

  const modelReportColumns = useMemo<ColDef<MeasurementModelReport>[]>(
    () => [
      { field: "item_detail_code", headerName: "품번/도번", minWidth: 160 },
      { field: "item_detail_name", flex: 1, headerName: "상세품명", minWidth: 160 },
      { field: "customer_name", headerName: "고객명", minWidth: 130, valueFormatter: ({ value }) => String(value ?? "") },
      { field: "history_count", headerName: "이력 수", minWidth: 90, maxWidth: 110 },
    ],
    [],
  );

  const reportRunColumns = useMemo<ColDef<InspectionMeasurementRun>[]>(
    () => [
      { field: "run_no", headerName: "회차", minWidth: 80, maxWidth: 95, valueFormatter: ({ value }) => `${value}회차` },
      { field: "created_at", flex: 1, headerName: "저장일시", minWidth: 180, valueFormatter: ({ value }) => new Date(String(value)).toLocaleString("ko-KR") },
      { field: "product_type_name", headerName: "제품구분", minWidth: 120, valueFormatter: ({ value }) => String(value ?? "") },
      { colId: "view", headerName: "성적서보기", minWidth: 130, maxWidth: 140, pinned: "right", sortable: false, cellRenderer: ({ data: run }: ICellRendererParams<InspectionMeasurementRun>) => run ? <div className="flex h-full items-center"><Button className="h-8" onClick={(event) => { event.stopPropagation(); openRun(run); }} size="sm" variant="secondary"><Eye aria-hidden="true" />보기</Button></div> : null },
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

  function openModel(model: MeasurementModelGroup | undefined) {
    if (!model) return;
    setSelectedModelName(model.model_name);
    setViewingModel(model);
    setModelReports(emptyModelReports);
    setSelectedReportSeq(null);
    setReportRuns(null);
    startDetailTransition(async () => {
      const reports = await searchMeasurementModelReports(model.model_name, 1);
      setModelReports(reports);
      const firstReportSeq = reports.rows[0]?.inspection_report_seq ?? null;
      setSelectedReportSeq(firstReportSeq);
      setReportRuns(firstReportSeq ? await searchMeasurementReportRuns(firstReportSeq, 1) : null);
    });
  }

  function loadModelReports(page: number) {
    if (!viewingModel) return;
    startDetailTransition(async () => {
      const reports = await searchMeasurementModelReports(viewingModel.model_name, page);
      setModelReports(reports);
      const firstReportSeq = reports.rows[0]?.inspection_report_seq ?? null;
      setSelectedReportSeq(firstReportSeq);
      setReportRuns(firstReportSeq ? await searchMeasurementReportRuns(firstReportSeq, 1) : null);
    });
  }

  function selectModelReport(report: MeasurementModelReport | undefined) {
    if (!report) return;
    setSelectedReportSeq(report.inspection_report_seq);
    setReportRuns(null);
    startDetailTransition(async () => setReportRuns(await searchMeasurementReportRuns(report.inspection_report_seq, 1)));
  }

  function loadReportRuns(page: number) {
    if (!selectedReportSeq) return;
    startDetailTransition(async () => setReportRuns(await searchMeasurementReportRuns(selectedReportSeq, page)));
  }

  function loadHistory(nextFilters: HistoryFilters, page: number) {
    startSearchTransition(async () => {
      const result = await searchMeasurementHistory({ ...nextFilters, page });
      setHistory(result);
      setSelectedRunSeq(null);
    });
  }

  function loadModelGroups(nextFilters: HistoryFilters, page: number) {
    startSearchTransition(async () => {
      const result = await searchMeasurementModelGroups({ ...nextFilters, page });
      setModelGroups(result);
      setModelGroupsLoaded(true);
      setSelectedModelName(null);
    });
  }

  function changeViewMode(mode: "runs" | "models") {
    setViewMode(mode);
    if (mode === "models" && !modelGroupsLoaded) loadModelGroups(filters, 1);
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters(draft);
    if (viewMode === "runs") loadHistory(draft, 1);
    else loadModelGroups(draft, 1);
  }

  function resetFilters() {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
    if (viewMode === "runs") loadHistory(emptyFilters, 1);
    else loadModelGroups(emptyFilters, 1);
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
        <button aria-selected={viewMode === "models"} className={`min-h-11 border-b-2 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring ${viewMode === "models" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`} onClick={() => changeViewMode("models")} role="tab" type="button">기종별</button>
      </div>
      <SearchConditions summary={viewMode === "runs" ? `총 ${history.total}건` : `총 ${modelGroups.total}건`}>
      <form
        className="min-w-0 overflow-x-auto p-4"
        onSubmit={submitFilters}
      >
        <div className="flex w-full min-w-[1040px] flex-nowrap items-end gap-3">
          {filterFields.map(([key, label, type]) => (
            <label className="grid w-44 shrink-0 gap-1.5 text-sm font-medium" key={key}>
              <span>{label}</span>
              <input
                className="h-12 min-w-0 rounded-sm border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="h-12"
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
              className="h-12 rounded-sm border border-input bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50"
              disabled={!draft.searchField}
              onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))}
              placeholder="검색어를 입력해 주세요"
              type="search"
              value={draft.keyword}
            />
          </label>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button disabled={isSearching} onClick={resetFilters} type="button" variant="secondary">
              <RotateCcw aria-hidden="true" />
              초기화
            </Button>
            <Button disabled={isSearching} type="submit">
              <Search aria-hidden="true" />
              {isSearching ? "조회 중..." : "조회"}
            </Button>
          </div>
        </div>
      </form>
      </SearchConditions>

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
      </section> : <section aria-labelledby="measurement-model-grid-title" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-y border-border">
        <div className="flex items-center justify-between bg-muted/70 px-4 py-3">
          <h2 className="font-semibold" id="measurement-model-grid-title">기종별 측정 이력</h2>
          <span aria-live="polite" className="text-xs text-muted-foreground">총 {modelGroups.total}개 기종 · {modelGroups.page}페이지</span>
        </div>
        <div className="min-h-[440px] min-w-0 flex-1 overflow-x-auto">
          {modelGroups.error ? <p className="py-20 text-center text-sm text-destructive" role="alert">{modelGroups.error}</p> : modelGroups.rows.length ? <div className="h-full min-w-[900px]"><AgGridProvider modules={modules}><AgGridReact columnDefs={modelColumns} defaultColDef={{ resizable: true, sortable: true }} getRowId={({ data: model }) => model.model_name} onCellKeyDown={(event: CellKeyDownEvent<MeasurementModelGroup>) => { if (event.event instanceof KeyboardEvent && event.event.key === "Enter") openModel(event.data); }} onRowClicked={(event: RowClickedEvent<MeasurementModelGroup>) => setSelectedModelName(event.data?.model_name ?? null)} onRowDataUpdated={({ api }) => syncSelectedGridRow(api, selectedModelName)} onRowDoubleClicked={(event: RowDoubleClickedEvent<MeasurementModelGroup>) => openModel(event.data)} rowData={modelGroups.rows} rowSelection={appGridSingleRowSelection} theme={appGridTheme} /></AgGridProvider></div> : <p className="py-20 text-center text-sm text-muted-foreground">조회조건에 맞는 기종별 측정 이력이 없어요.</p>}
        </div>
        <div className="flex min-h-14 items-center justify-end gap-2 border-t border-border px-4">
          <Button disabled={isSearching || modelGroups.page <= 1} onClick={() => loadModelGroups(filters, modelGroups.page - 1)} size="sm" type="button" variant="secondary"><ChevronLeft aria-hidden="true" />이전</Button>
          <Button disabled={isSearching || modelGroups.page * modelGroups.pageSize >= modelGroups.total} onClick={() => loadModelGroups(filters, modelGroups.page + 1)} size="sm" type="button" variant="secondary">다음<ChevronRight aria-hidden="true" /></Button>
        </div>
      </section>}

      <Dialog.Root open={viewingModel !== null} onOpenChange={(open) => { if (!open) setViewingModel(null); }}>
        <WorkspaceDialogPortal>
          <Dialog.Backdrop className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px]" />
          <Dialog.Viewport className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-5">
            <Dialog.Popup className="flex h-[min(820px,calc(100svh-1rem))] w-full max-w-[1280px] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-xl outline-none sm:h-[min(820px,calc(100svh-2.5rem))]">
              <div className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-5">
                <div className="min-w-0"><Dialog.Title className="truncate text-lg font-semibold">{viewingModel?.model_name ?? "기종 검사서"}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">기종에 속한 모든 품목과 품목상세의 측정 검사서를 조회해요.</Dialog.Description></div>
                <Dialog.Close aria-label="기종 검사서 닫기" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-accent"><X aria-hidden="true" /></Dialog.Close>
              </div>
              <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(380px,0.85fr)_minmax(500px,1.15fr)] md:overflow-hidden">
                <section aria-labelledby="model-report-list-title" className="flex min-h-[320px] min-w-0 flex-col overflow-hidden border-y border-border md:min-h-0">
                  <div className="flex min-h-12 items-center justify-between bg-muted/70 px-3"><h3 className="font-semibold" id="model-report-list-title">검사서 목록</h3><span className="text-xs text-muted-foreground">총 {modelReports.total}개</span></div>
                  <div className="min-h-0 flex-1 overflow-x-auto">{modelReports.error ? <div className="flex h-full items-center justify-center p-6 text-sm text-destructive" role="alert">{modelReports.error}</div> : modelReports.rows.length ? <div className="h-full min-w-[620px]"><AgGridProvider modules={modules}><AgGridReact columnDefs={modelReportColumns} defaultColDef={{ resizable: true, sortable: true }} getRowId={({ data: report }) => String(report.inspection_report_seq)} onCellKeyDown={(event: CellKeyDownEvent<MeasurementModelReport>) => { if (event.event instanceof KeyboardEvent && event.event.key === "Enter") selectModelReport(event.data); }} onRowClicked={(event: RowClickedEvent<MeasurementModelReport>) => selectModelReport(event.data)} onRowDataUpdated={({ api }) => syncSelectedGridRow(api, selectedReportSeq)} rowData={modelReports.rows} rowSelection={appGridSingleRowSelection} theme={appGridTheme} /></AgGridProvider></div> : isDetailLoading ? <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">검사서 목록을 불러오는 중이에요.</div> : <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">저장된 검사서가 없어요.</div>}</div>
                  <div className="flex min-h-12 items-center justify-end gap-2 border-t border-border px-3"><Button disabled={isDetailLoading || modelReports.page <= 1} onClick={() => loadModelReports(modelReports.page - 1)} size="sm" type="button" variant="secondary"><ChevronLeft aria-hidden="true" />이전</Button><Button disabled={isDetailLoading || modelReports.page * modelReports.pageSize >= modelReports.total} onClick={() => loadModelReports(modelReports.page + 1)} size="sm" type="button" variant="secondary">다음<ChevronRight aria-hidden="true" /></Button></div>
                </section>
                <section aria-labelledby="model-report-history-title" className="flex min-h-[320px] min-w-0 flex-col overflow-hidden border-y border-border md:min-h-0">
                  <div className="flex min-h-12 items-center justify-between bg-muted/70 px-3"><h3 className="font-semibold" id="model-report-history-title">측정 이력</h3><span className="text-xs text-muted-foreground">총 {reportRuns?.total ?? 0}건 · 최신순</span></div>
                  <div className="min-h-0 flex-1 overflow-x-auto">{isDetailLoading && !reportRuns ? <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">측정 이력을 불러오는 중이에요.</div> : reportRuns?.error ? <div className="flex h-full items-center justify-center p-6 text-sm text-destructive" role="alert">{reportRuns.error}</div> : reportRuns?.rows.length ? <div className="h-full min-w-[620px]"><AgGridProvider modules={modules}><AgGridReact columnDefs={reportRunColumns} defaultColDef={{ resizable: true, sortable: true }} getRowId={({ data: run }) => String(run.seq)} onCellKeyDown={(event: CellKeyDownEvent<InspectionMeasurementRun>) => { if (event.event instanceof KeyboardEvent && event.event.key === "Enter") openRun(event.data); }} onRowDoubleClicked={(event: RowDoubleClickedEvent<InspectionMeasurementRun>) => openRun(event.data)} rowData={reportRuns.rows} theme={appGridTheme} /></AgGridProvider></div> : <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">왼쪽에서 검사서를 선택해 주세요.</div>}</div>
                  <div className="flex min-h-12 items-center justify-end gap-2 border-t border-border px-3"><Button disabled={isDetailLoading || !reportRuns || reportRuns.page <= 1} onClick={() => loadReportRuns((reportRuns?.page ?? 1) - 1)} size="sm" type="button" variant="secondary"><ChevronLeft aria-hidden="true" />이전</Button><Button disabled={isDetailLoading || !reportRuns || reportRuns.page * reportRuns.pageSize >= reportRuns.total} onClick={() => loadReportRuns((reportRuns?.page ?? 1) + 1)} size="sm" type="button" variant="secondary">다음<ChevronRight aria-hidden="true" /></Button></div>
                </section>
              </div>
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
