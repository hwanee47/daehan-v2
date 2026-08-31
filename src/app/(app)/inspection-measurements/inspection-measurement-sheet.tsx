"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { Clock3, Expand, Plus, Printer, RotateCcw, Save, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { SearchConditions } from "@/components/ui/search-conditions";
import { Select } from "@/components/ui/select";
import { WorkspaceAlertDialogPortal, WorkspaceDialogPortal } from "@/components/ui/workspace-portal";
import { useSaveFormShortcut } from "@/hooks/use-save-form-shortcut";
import { cn } from "@/lib/utils";

import { saveInspectionMeasurements } from "../inspection-reports/actions";
import { InspectionMarkerImage, type InspectionMarker } from "../inspection-reports/inspection-marker-image";
import type { InspectionReportActionState, InspectionReportData, InspectionReportDraftItem } from "../inspection-reports/types";
import { getRecentMeasurementHistory, searchMeasurementReports, type RecentMeasurementHistoryResult, type RecentMeasurementRun } from "./actions";

const initialState: InspectionReportActionState = { status: "idle" };

function valueText(value: number | string | null | undefined) { return value === null || value === undefined ? "" : String(value); }

function signedTolerance(value: string) {
  const number = Number(value);
  if (!value.trim() || !Number.isFinite(number)) return value.trim();
  return number > 0 ? `+${value.trim()}` : value.trim();
}

function toleranceText(min: string, max: string) {
  const minText = min.trim();
  const maxText = max.trim();
  if (!minText) return signedTolerance(maxText);
  if (!maxText) return signedTolerance(minText);

  const minNumber = Number(minText);
  const maxNumber = Number(maxText);
  if (Number.isFinite(minNumber) && Number.isFinite(maxNumber) && minNumber < 0 && maxNumber > 0 && Math.abs(minNumber) === Math.abs(maxNumber)) {
    return `±${Math.abs(maxNumber)}`;
  }

  return `${signedTolerance(maxText)}\n${signedTolerance(minText)}`;
}

function MarkerFullscreenDialog({ label, markers, onClose, url }: { label: string; markers: InspectionMarker[]; onClose: () => void; url: string }) {
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}><WorkspaceDialogPortal><Dialog.Backdrop className="fixed inset-0 z-[70] bg-foreground/90 backdrop-blur-sm" /><Dialog.Viewport className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"><Dialog.Popup className="relative size-full outline-none"><Dialog.Title className="sr-only">{label} 이미지 전체 화면 보기</Dialog.Title><Dialog.Description className="sr-only">검사항목 순번이 표시된 이미지를 화면에 맞춰 보여줘요.</Dialog.Description><InspectionMarkerImage alt={`${label} 도면 또는 제품 이미지`} markerSize="fixed" markers={markers} url={url} /><Dialog.Close aria-label="전체 화면 닫기" className="absolute right-1 top-1 z-20 inline-flex size-11 items-center justify-center rounded-full bg-background text-foreground shadow-lg sm:right-3 sm:top-3"><X aria-hidden="true" /></Dialog.Close></Dialog.Popup></Dialog.Viewport></WorkspaceDialogPortal></Dialog.Root>;
}

export function InspectionMeasurementSheet({ data, fillContainer = false, floatingPrintButton = false, initialReportSeq, initialRunSeq = null, initialViewMode = "input", selectionRequestId = 0, showHistorySelector = true, showModeTabs = true, showReportList = true }: { data: InspectionReportData; fillContainer?: boolean; floatingPrintButton?: boolean; initialReportSeq?: number; initialRunSeq?: number | null; initialViewMode?: "input" | "history"; selectionRequestId?: number; showHistorySelector?: boolean; showModeTabs?: boolean; showReportList?: boolean }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"input" | "history">(initialViewMode);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(initialReportSeq ?? data.reports[0]?.seq ?? null);
  const [visibleReports, setVisibleReports] = useState(data.reports);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchPending, startSearchTransition] = useTransition();
  const [selectedRunSeq, setSelectedRunSeq] = useState<number | null>(initialRunSeq);
  const [handledSelectionRequestId, setHandledSelectionRequestId] = useState(selectionRequestId);
  if (selectionRequestId !== handledSelectionRequestId && initialReportSeq && data.reports.some((report) => report.seq === initialReportSeq)) {
    setHandledSelectionRequestId(selectionRequestId);
    setViewMode("input");
    setVisibleReports(data.reports);
    setSearchKeyword("");
    setSearchError(null);
    setSelectedSeq(initialReportSeq);
    setSelectedRunSeq(null);
  }
  const currentReport = visibleReports.find((item) => item.seq === selectedSeq) ?? null;
  const reportRuns = useMemo(() => data.measurementRuns.filter((run) => run.inspection_report_seq === selectedSeq), [data.measurementRuns, selectedSeq]);
  const historyRun = viewMode === "history" ? data.measurementRuns.find((run) => run.seq === selectedRunSeq) ?? null : null;
  const isHistory = viewMode === "history";
  const report = historyRun ? {
    seq: historyRun.inspection_report_seq, model_name: historyRun.model_name, item_seq: historyRun.item_seq, item_code: historyRun.item_code, item_name: historyRun.item_name ?? "", item_detail_seq: historyRun.item_detail_seq,
    item_detail_code: historyRun.item_detail_code, item_detail_name: historyRun.item_detail_name ?? historyRun.item_detail_code, material: historyRun.material, image_path: historyRun.image_path, image_url: historyRun.image_url, customer_name: historyRun.customer_name, supplier_name: historyRun.supplier_name,
    delivery_quantity: historyRun.delivery_quantity, sample_count: historyRun.sample_count, product_type_code_seq: historyRun.product_type_code_seq,
    product_type_code: historyRun.product_type_code, product_type_name: historyRun.product_type_name,
    hardness: historyRun.hardness, heat_treatment: historyRun.heat_treatment, final_judgment_code_seq: null,
  } : isHistory ? null : currentReport;
  const reportItems = historyRun ? data.measurementRunItems.filter((item) => item.measurement_run_seq === historyRun.seq).map((item) => ({
    seq: item.source_report_item_seq ?? item.seq, sort_order: item.sort_order, inspection_report_seq: historyRun.inspection_report_seq,
    nominal_dimension: item.nominal_dimension, tolerance_min: item.tolerance_min, tolerance_max: item.tolerance_max,
    marker_x_ratio: item.marker_x_ratio, marker_y_ratio: item.marker_y_ratio,
  })) : isHistory ? [] : data.items.filter((item) => item.inspection_report_seq === selectedSeq);
  const initialRows = reportItems.map((item): InspectionReportDraftItem => {
    const measurement = historyRun ? data.measurementRunItems.find((row) => row.measurement_run_seq === historyRun.seq && (row.source_report_item_seq ?? row.seq) === item.seq) : undefined;
    return { seq: item.seq, nominalDimension: valueText(item.nominal_dimension), toleranceMin: valueText(item.tolerance_min), toleranceMax: valueText(item.tolerance_max), results: Array.from({ length: 10 }, (_, index) => valueText(measurement?.[`result_${index + 1}` as keyof typeof measurement] as number | null)), note: measurement?.note ?? "", markerXRatio: item.marker_x_ratio, markerYRatio: item.marker_y_ratio };
  });
  const [rowsByReport, setRowsByReport] = useState<Record<number, InspectionReportDraftItem[]>>({});
  const rows = isHistory ? initialRows : report ? rowsByReport[report.seq] ?? initialRows : [];
  const [productTypeByReport, setProductTypeByReport] = useState<Record<number, number | null>>({});
  const selectedProductTypeSeq = historyRun?.product_type_code_seq ?? (report ? report.seq in productTypeByReport ? productTypeByReport[report.seq] : report.product_type_code_seq : null);
  const [fullscreen, setFullscreen] = useState(false);
  const [printDateTime, setPrintDateTime] = useState("");
  const [recentHistoryOpen, setRecentHistoryOpen] = useState(false);
  const [recentHistory, setRecentHistory] = useState<RecentMeasurementHistoryResult>({ runs: [], error: null });
  const [pendingHistoryRun, setPendingHistoryRun] = useState<RecentMeasurementRun | null>(null);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [isRecentHistoryPending, startRecentHistoryTransition] = useTransition();
  const [state, action, pending] = useActionState(async (previousState: InspectionReportActionState, formData: FormData) => {
    const result = await saveInspectionMeasurements(previousState, formData);
    if (result.status === "success" && result.reportSeq) {
      const savedReportSeq = result.reportSeq;
      setRowsByReport((current) => {
        const savedRows = current[savedReportSeq];
        if (!savedRows) return current;
        return { ...current, [savedReportSeq]: savedRows.map((row) => ({ ...row, results: Array(10).fill(""), note: "" })) };
      });
    }
    return result;
  }, initialState);
  const onSaveFormKeyDown = useSaveFormShortcut();
  const handledRunSeq = useRef<number | null>(null);
  const item = report ? { seq: report.item_detail_seq, item_detail_code: report.item_detail_code, item_detail_name: report.item_detail_name, material: report.material, image_url: report.image_url, item_name: report.item_name, model_name: report.model_name } : undefined;
  const productCodes = data.codes.filter((code) => code.group_code === "U0002");
  const productName = report?.product_type_name ?? "";
  const markers = reportItems.flatMap((reportItem) => reportItem.marker_x_ratio === null || reportItem.marker_y_ratio === null ? [] : [{ x: reportItem.marker_x_ratio, y: reportItem.marker_y_ratio, label: reportItem.sort_order }]);

  function setRows(next: InspectionReportDraftItem[]) { if (report) setRowsByReport((current) => ({ ...current, [report.seq]: next })); }
  function updateResult(rowIndex: number, resultIndex: number, value: string) { const next = rows.map((row, index) => index === rowIndex ? { ...row, results: row.results.map((result, sampleIndex) => sampleIndex === resultIndex ? value : result) } : row); setRows(next); }
  function selectReport(reportSeq: number) {
    setSelectedSeq(reportSeq);
    setSelectedRunSeq(viewMode === "history" ? data.measurementRuns.find((run) => run.inspection_report_seq === reportSeq)?.seq ?? null : null);
  }
  function isCompatibleHistory(run: RecentMeasurementRun) {
    return run.items.length === reportItems.length && reportItems.every((currentItem, index) => {
      const historyItem = run.items[index];
      return historyItem
        && historyItem.sort_order === currentItem.sort_order
        && historyItem.nominal_dimension.trim() === String(currentItem.nominal_dimension).trim()
        && Number(historyItem.tolerance_min) === Number(currentItem.tolerance_min)
        && Number(historyItem.tolerance_max) === Number(currentItem.tolerance_max);
    });
  }
  function applyHistory(run: RecentMeasurementRun) {
    if (!report || !isCompatibleHistory(run)) return;
    const sampleCount = report.sample_count;
    setRows(rows.map((row, rowIndex) => {
      const historyItem = run.items[rowIndex];
      return {
        ...row,
        results: Array.from({ length: 10 }, (_, resultIndex) => sampleCount !== null && resultIndex >= sampleCount ? "" : valueText(historyItem[`result_${resultIndex + 1}` as keyof typeof historyItem] as number | null)),
        note: historyItem.note ?? "",
      };
    }));
    setPendingHistoryRun(null);
    setOverwriteConfirmOpen(false);
    setRecentHistoryOpen(false);
  }
  function requestHistoryApply(run: RecentMeasurementRun) {
    const hasInput = rows.some((row) => row.results.some((result) => result.trim() !== "") || row.note.trim() !== "");
    if (hasInput) {
      setPendingHistoryRun(run);
      setOverwriteConfirmOpen(true);
      return;
    }
    applyHistory(run);
  }
  function openRecentHistory() {
    if (!currentReport) return;
    setRecentHistoryOpen(true);
    setRecentHistory({ runs: [], error: null });
    startRecentHistoryTransition(async () => setRecentHistory(await getRecentMeasurementHistory(currentReport.seq)));
  }
  function resetMeasurementInput() {
    setRows(rows.map((row) => ({ ...row, results: Array(10).fill(""), note: "" })));
    setResetConfirmOpen(false);
    setActionMenuOpen(false);
  }
  function requestMeasurementReset() {
    const hasInput = rows.some((row) => row.results.some((result) => result.trim() !== "") || row.note.trim() !== "");
    if (hasInput) setResetConfirmOpen(true);
    else resetMeasurementInput();
  }
  function loadReports(keyword: string) {
    startSearchTransition(async () => {
      const result = await searchMeasurementReports(keyword);
      setSearchError(result.error);
      if (result.error) return;
      const originalBySeq = new Map(data.reports.map((report) => [report.seq, report]));
      const nextReports = result.rows.map((report) => ({ ...report, image_url: originalBySeq.get(report.seq)?.image_url ?? null }));
      setVisibleReports(nextReports);
      setSelectedSeq((current) => nextReports.some((report) => report.seq === current) ? current : nextReports[0]?.seq ?? null);
    });
  }
  function selectViewMode(mode: "input" | "history") {
    setViewMode(mode);
    setSelectedRunSeq(mode === "history" ? data.measurementRuns.find((run) => run.inspection_report_seq === selectedSeq)?.seq ?? null : null);
  }
  function preparePrint() {
    setPrintDateTime(new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "medium", hour12: false }).format(new Date()));
  }
  function openPrintDialog() {
    const originalTitle = document.title;
    const restoreTitle = () => { document.title = originalTitle; };
    document.title = "";
    window.addEventListener("afterprint", restoreTitle, { once: true });
    window.setTimeout(() => window.print(), 0);
  }

  useEffect(() => {
    if (state.status !== "success" || !state.runSeq || handledRunSeq.current === state.runSeq) return;
    handledRunSeq.current = state.runSeq;
    router.refresh();
  }, [router, state]);

  if (data.hasError) return <div className="border-y border-border p-10 text-center" role="alert"><h2 className="font-semibold">검사성적서를 불러오지 못했어요</h2><p className="mt-2 text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p></div>;

  return <div className={cn("flex min-w-0 flex-col", fillContainer && "h-full min-h-0")}>
    {showModeTabs ? <div aria-label="측정 관리 화면" className="inspection-print-hide mb-4 flex gap-1 border-b border-border" role="tablist">
      <button aria-controls="measurement-input-panel" aria-selected={viewMode === "input"} className={cn("min-h-11 border-b-2 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", viewMode === "input" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} id="measurement-input-tab" onClick={() => selectViewMode("input")} onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); selectViewMode("history"); } }} role="tab" type="button">결과 입력</button>
      <button aria-controls="measurement-history-panel" aria-selected={viewMode === "history"} className={cn("min-h-11 border-b-2 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", viewMode === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} id="measurement-history-tab" onClick={() => selectViewMode("history")} onKeyDown={(event) => { if (event.key === "ArrowLeft") { event.preventDefault(); selectViewMode("input"); } }} role="tab" type="button">측정 이력</button>
    </div> : null}
  {!isHistory && showReportList ? <SearchConditions className="inspection-print-hide mb-3" summary={`검색 결과 ${visibleReports.length}건`}>
    <form className="flex flex-col gap-3 p-3 @min-[640px]/workspace:flex-row @min-[640px]/workspace:items-end" id="measurement-report-search" onSubmit={(event) => { event.preventDefault(); loadReports(searchKeyword); }}>
      <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-medium"><span>통합검색</span><span className="relative"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="h-12 w-full rounded-sm border border-input bg-background pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={100} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="기종, 품번/도번, 품목상세명, 고객명" type="search" value={searchKeyword} /></span></label>
      <div className="flex shrink-0 gap-2"><Button disabled={isSearchPending} onClick={() => { setSearchKeyword(""); loadReports(""); }} type="button" variant="secondary"><RotateCcw aria-hidden="true" />초기화</Button><Button disabled={isSearchPending} type="submit"><Search aria-hidden="true" />{isSearchPending ? "조회 중" : "조회"}</Button></div>
    </form>
    {searchError ? <p className="border-t border-border px-3 py-2 text-sm text-destructive" role="alert">{searchError}</p> : null}
  </SearchConditions> : null}
  <div aria-labelledby={showModeTabs ? viewMode === "input" ? "measurement-input-tab" : "measurement-history-tab" : undefined} className={cn("grid min-h-[680px] min-w-0 gap-5", fillContainer && "min-h-0 flex-1", showReportList && "@min-[1024px]/workspace:grid-cols-[280px_minmax(0,1fr)] @min-[1280px]/workspace:grid-cols-[300px_minmax(0,1fr)]")} id={showModeTabs ? viewMode === "input" ? "measurement-input-panel" : "measurement-history-panel" : undefined} role={showModeTabs ? "tabpanel" : undefined}>
    {showReportList ? <aside aria-labelledby="measurement-report-list-title" className="min-w-0 self-start border-y border-border @min-[1024px]/workspace:sticky @min-[1024px]/workspace:top-0">
      <div className="flex items-center justify-between bg-muted/70 px-4 py-3"><h2 className="font-semibold" id="measurement-report-list-title">검사성적서</h2><span className="text-xs text-muted-foreground">총 {visibleReports.length}건</span></div>
      <div className="max-h-72 overflow-y-auto @min-[1024px]/workspace:max-h-[calc(100svh-190px)]">
        {visibleReports.length ? <div className="divide-y divide-border">{visibleReports.map((value) => {
          const selected = value.seq === selectedSeq;
          return <button aria-pressed={selected} className={cn("block min-h-24 w-full px-4 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", selected && "bg-primary/10 hover:bg-primary/10")} key={value.seq} onClick={() => selectReport(value.seq)} type="button"><strong className="block truncate text-sm">#{value.seq} · {value.item_detail_code}</strong><span className="mt-2 block truncate text-sm text-foreground">{value.item_detail_name || "품목상세명 미입력"}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{value.model_name}{value.customer_name ? ` · ${value.customer_name}` : ""}</span></button>;
        })}</div> : <p className="px-4 py-12 text-center text-sm text-muted-foreground">{data.reports.length ? "검색 결과가 없어요." : "등록된 검사성적서가 없어요."}</p>}
      </div>
    </aside> : null}

    <section aria-label={isHistory ? "측정 이력 조회" : "측정결과 입력"} className={cn("min-w-0", fillContainer && "h-full min-h-0")}>
    {!report ? <div className="flex min-h-72 items-center justify-center border-y border-border p-10 text-center text-muted-foreground">{isHistory ? reportRuns.length ? "조회할 회차를 선택해 주세요." : "저장 또는 인쇄 이력이 없어요." : "왼쪽 목록에서 측정할 검사성적서를 선택해 주세요."}</div> : <form action={action} className={cn("inspection-measurement-form relative flex min-w-0 flex-col gap-3", fillContainer ? "h-full min-h-0" : "@min-[1024px]/workspace:h-[calc(100svh-190px)]")} onKeyDown={onSaveFormKeyDown}>
      <input name="reportSeq" type="hidden" value={report.seq} /><input name="productTypeCodeSeq" type="hidden" value={selectedProductTypeSeq ?? ""} /><input name="items" type="hidden" value={JSON.stringify(rows)} />
      {isHistory && showHistorySelector ? <div className="inspection-print-hide flex flex-wrap items-center justify-end gap-2">
        <label className="text-sm font-medium" htmlFor="measurement-run">조회 회차</label>
        <div className="min-w-56">
          <Select
            aria-label="조회 회차"
            id="measurement-run"
            onValueChange={(value) => setSelectedRunSeq(value ? Number(value) : null)}
            options={reportRuns.map((run) => ({
              label: `${run.run_no}회차 · ${run.event_type === "print" ? "인쇄" : run.event_type === "migration" ? "기존값" : "저장"} · ${new Date(run.created_at).toLocaleString("ko-KR")}`,
              value: String(run.seq),
            }))}
            placeholder="조회할 회차를 선택해 주세요"
            value={selectedRunSeq === null ? undefined : String(selectedRunSeq)}
          />
        </div>
        <span className="text-xs text-muted-foreground">과거 이력은 읽기 전용이에요.</span>
      </div> : null}
      {!isHistory && state.message ? <p className={cn("inspection-print-hide shrink-0 border-y px-4 py-2.5 text-sm font-medium", state.status === "error" ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-primary/20 bg-primary/10 text-primary")} role="status">{state.message}</p> : null}
      <div className="min-h-0 min-w-0 flex-1 overflow-auto border border-border bg-muted/25 p-2 @min-[768px]/workspace:p-4">
        <article className="inspection-print-sheet w-full min-w-[980px] bg-white text-[13px] leading-tight text-black shadow-sm" aria-label="검사성적서 측정 양식">
          <div className="grid h-20 grid-cols-[1fr_300px] border border-black">
            <h2 className="flex items-center justify-center text-3xl font-semibold tracking-[0.35em]">검 사 성 적 서</h2>
            <div className="grid grid-cols-3 border-l border-black"><div className="grid grid-rows-[24px_1fr] border-r border-black text-center"><span className="border-b border-black py-1">작 성</span><span /></div><div className="grid grid-rows-[24px_1fr] border-r border-black text-center"><span className="border-b border-black py-1">검 토</span><span /></div><div className="grid grid-rows-[24px_1fr] text-center"><span className="border-b border-black py-1">승 인</span><span /></div></div>
          </div>
          <div className="grid grid-cols-4 border-x border-b border-black">{[["기종", report.model_name], ["품명", item?.item_detail_name ?? report.item_detail_name ?? ""], ["품번/도번", report.item_detail_code], ["고객", report.customer_name ?? ""]].map(([label, value]) => <p className="border-r border-black p-2 last:border-r-0" key={label}><b>{label} :</b> <span className="text-xs">{value}</span></p>)}</div>
          <div className="grid grid-cols-4 border-x border-b border-black">{[["업체명", report.supplier_name ?? ""], ["납품수량", report.delivery_quantity?.toLocaleString() ?? ""], ["시료수", report.sample_count === null ? "" : String(report.sample_count)], ["납품일자", ""]].map(([label, value]) => <p className="border-r border-black p-2 last:border-r-0" key={label}><b>{label} :</b> <span className="text-xs">{value}</span></p>)}</div>
	          <div aria-label="제품구분" className="flex h-9 items-center gap-5 border-x border-b border-black px-2" role="group"><b className="inline-flex h-full items-center leading-none">제품구분 :</b>{productCodes.map((code) => <label className="inline-flex h-full items-center gap-1 text-xs leading-none" key={code.seq}><input checked={code.seq === selectedProductTypeSeq} className="m-0 size-3.5 shrink-0 accent-black" disabled={isHistory} onChange={() => setProductTypeByReport((current) => ({ ...current, [report.seq]: selectedProductTypeSeq === code.seq ? null : code.seq }))} type="checkbox" />{code.code_name}</label>)}{productCodes.length === 0 || isHistory && selectedProductTypeSeq !== null && !productCodes.some((code) => code.seq === selectedProductTypeSeq) ? <span className="inline-flex h-full items-center text-xs leading-none">{historyRun?.product_type_name ?? productName}</span> : null}</div>
          <div className="relative h-[300px] overflow-hidden border-x border-b border-black"><p className="absolute left-2 top-2 z-20 bg-white/85 pr-2 font-semibold">약도</p>{item?.image_url ? <><InspectionMarkerImage alt={`${item.item_detail_name} 도면 또는 제품 이미지`} markers={markers} url={item.image_url} /><button aria-label="순번이 표시된 이미지 전체 화면 보기" className="inspection-print-hide absolute right-3 top-1 z-20 inline-flex size-10 items-center justify-center border border-black bg-white" onClick={() => setFullscreen(true)} type="button"><Expand aria-hidden="true" size={18} /></button></> : null}</div>
          <div className="grid grid-cols-[120px_72px_repeat(10,minmax(0,1fr))_80px] border-x border-b border-black text-left"><b className="border-r border-black p-2 text-center">중요항목</b><span className="col-span-4 border-r border-black p-2">재질 : <span className="text-xs">{item?.material ?? ""}</span></span><span className="col-span-5 border-r border-black p-2">경도 : <span className="text-xs">{report.hardness ?? ""}</span></span><span className="col-span-3 p-2">열처리 : <span className="text-xs">{report.heat_treatment ?? ""}</span></span></div>
	          <table className="w-full table-fixed border-collapse border-x border-b border-black text-center"><colgroup><col className="w-10"/><col className="w-[60px]"/><col className="w-[72px]"/>{Array.from({length:10},(_,i)=><col key={i}/>)}<col className="w-20"/></colgroup><thead><tr><th className="border-b border-r border-black p-1" rowSpan={2}>순번</th><th className="border-b border-r border-black p-1" rowSpan={2}>기준<br/>치수</th><th className="border-b border-r border-black p-1" rowSpan={2}>공차</th><th className="border-b border-r border-black p-1" colSpan={10}>측 정 결 과</th><th className="border-b border-black p-1" rowSpan={2}>비고</th></tr><tr>{Array.from({ length: 10 }, (_, index) => <th className="border-b border-r border-black p-1 font-medium" key={index}>X<sub>{index + 1}</sub></th>)}</tr></thead><tbody>{Array.from({ length: Math.max(10, rows.length) }, (_, rowIndex) => { const row = rows[rowIndex]; if (!row) return <tr key={`blank-${rowIndex}`}><td className="h-9 border-b border-r border-black">{rowIndex + 1}</td><td className="border-b border-r border-black"/><td className="border-b border-r border-black"/>{Array.from({ length: 10 }, (_, resultIndex) => <td className="border-b border-r border-black" key={resultIndex}/>)}<td className="border-b border-black"/></tr>; return <tr key={row.seq}><td className="h-9 border-b border-r border-black">{rowIndex + 1}</td><td className="border-b border-r border-black tabular-nums">{row.nominalDimension}</td><td className="whitespace-pre-line border-b border-r border-black px-1 leading-tight tabular-nums">{toleranceText(row.toleranceMin, row.toleranceMax)}</td>{row.results.map((result, resultIndex) => { const enabled = report.sample_count === null || resultIndex < report.sample_count; return <td className={cn("border-b border-r border-black", !enabled && "bg-neutral-100")} key={resultIndex}><input aria-label={`${rowIndex + 1}번 항목 X${resultIndex + 1}`} className="h-9 w-full bg-transparent px-1 text-center outline-none focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:text-black disabled:opacity-100" disabled={isHistory || !enabled} inputMode="decimal" value={enabled ? result : ""} onChange={(event) => updateResult(rowIndex, resultIndex, event.target.value)} /></td>;})}<td className="border-b border-black"><input aria-label={`${rowIndex + 1}번 항목 비고`} className="h-9 w-full bg-transparent px-1 outline-none focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:text-black disabled:opacity-100" disabled={isHistory} maxLength={500} value={row.note} onChange={(event) => setRows(rows.map((value, index) => index === rowIndex ? { ...value, note: event.target.value } : value))} /></td></tr>; })}</tbody></table>
          <div className="grid min-h-24 grid-cols-[120px_72px_repeat(10,minmax(0,1fr))_80px] border-x border-b border-black">
            <div className="col-span-5 border-r border-black p-2 font-semibold">* 특기사항</div>
            <div className="flex items-center justify-center border-r border-black text-center font-semibold leading-snug">최종<br/>판정</div>
            <div className="col-span-7 grid grid-rows-[2fr_1fr]"><div className="flex items-center justify-center gap-10 border-b border-black text-sm font-semibold"><span>□ 합 격</span><span>□ 불 합 격</span></div><div className="grid grid-cols-2"><span className="flex items-center border-r border-black p-2">검사자:</span><span className="flex items-center p-2">검사일자:</span></div></div>
          </div>
          <time className="inspection-print-datetime" dateTime={printDateTime}>{printDateTime}</time>
        </article>
      </div>
      {isHistory ? <div className={cn("inspection-print-hide flex items-center justify-end", floatingPrintButton ? "fixed bottom-6 right-6 z-[90] rounded-full border border-border bg-background p-2 shadow-xl sm:bottom-9 sm:right-9" : "sticky bottom-0 z-30 py-2")}><Button disabled={pending} onClick={() => { preparePrint(); window.setTimeout(openPrintDialog, 0); }} type="button" variant="secondary"><Printer aria-hidden="true" />인쇄</Button></div> : <div className="inspection-print-hide absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActionMenuOpen(false); }} onFocusCapture={() => setActionMenuOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setActionMenuOpen(false); } }} onMouseEnter={() => setActionMenuOpen(true)} onMouseLeave={() => setActionMenuOpen(false)}>
        <div aria-label="측정결과 작업" className={cn("flex flex-col items-end gap-2 transition-all duration-200", actionMenuOpen ? "visible translate-y-0 opacity-100" : "invisible translate-y-2 opacity-0")} id="measurement-floating-actions">
          <Button disabled={pending || !currentReport} onClick={() => { setActionMenuOpen(false); openRecentHistory(); }} type="button" variant="secondary"><Clock3 aria-hidden="true" />최근 이력</Button>
          <Button disabled={pending} onClick={requestMeasurementReset} type="button" variant="secondary"><RotateCcw aria-hidden="true" />초기화</Button>
          <Button disabled={pending} onClick={() => { setActionMenuOpen(false); preparePrint(); window.setTimeout(openPrintDialog, 0); }} type="button" variant="secondary"><Printer aria-hidden="true" />인쇄</Button>
          <Button data-save-submit="true" disabled={pending} name="eventType" onClick={() => setActionMenuOpen(false)} type="submit" value="save"><Save aria-hidden="true" />{pending ? "저장 중..." : "저장"}</Button>
        </div>
        <Button aria-controls="measurement-floating-actions" aria-expanded={actionMenuOpen} aria-label={actionMenuOpen ? "측정결과 작업 메뉴 닫기" : "측정결과 작업 메뉴 열기"} className="rounded-full shadow-xl" onClick={() => setActionMenuOpen((current) => !current)} size="icon-lg" type="button"><Plus aria-hidden="true" className={cn("transition-transform duration-200", actionMenuOpen && "rotate-45")} /></Button>
      </div>}
    </form>}
    </section>
    {fullscreen && item?.image_url ? <MarkerFullscreenDialog label={item.item_detail_name} markers={markers} onClose={() => setFullscreen(false)} url={item.image_url} /> : null}
    <Dialog.Root open={recentHistoryOpen} onOpenChange={setRecentHistoryOpen}>
      <WorkspaceDialogPortal>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-foreground/30 backdrop-blur-[2px]" />
        <Dialog.Viewport className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5">
          <Dialog.Popup className="flex max-h-[calc(100svh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl outline-none sm:max-h-[calc(100svh-2.5rem)]">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div><Dialog.Title className="text-xl font-semibold">최근 측정이력</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">최근 5개 이력의 측정값과 비고를 신규 입력값으로 불러올 수 있어요.</Dialog.Description></div>
              <Dialog.Close aria-label="최근 이력 닫기" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-accent"><X aria-hidden="true" /></Dialog.Close>
            </div>
            <div className="min-h-40 overflow-y-auto p-4 sm:p-5">
              {isRecentHistoryPending ? <p className="py-12 text-center text-sm text-muted-foreground">최근 이력을 불러오는 중이에요.</p> : recentHistory.error ? <p className="py-12 text-center text-sm text-destructive" role="alert">{recentHistory.error}</p> : recentHistory.runs.length ? <ul className="divide-y divide-border border-y border-border">{recentHistory.runs.map((run) => {
                const compatible = isCompatibleHistory(run);
                return <li className="flex min-h-20 flex-col justify-center gap-3 px-3 py-3 sm:flex-row sm:items-center" key={run.seq}><div className="min-w-0 flex-1"><p className="font-semibold">{run.runNo}회차</p><time className="mt-1 block text-sm text-muted-foreground" dateTime={run.createdAt}>{new Date(run.createdAt).toLocaleString("ko-KR")}</time>{!compatible ? <p className="mt-1 text-xs text-destructive">현재 검사항목 구조와 달라 불러올 수 없어요.</p> : null}</div><Button className="shrink-0" disabled={!compatible} onClick={() => requestHistoryApply(run)} type="button" variant="secondary">불러오기</Button></li>;
              })}</ul> : <p className="py-12 text-center text-sm text-muted-foreground">저장된 측정이력이 없어요.</p>}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </WorkspaceDialogPortal>
    </Dialog.Root>
    <AlertDialog.Root open={overwriteConfirmOpen} onOpenChange={setOverwriteConfirmOpen}>
      <WorkspaceAlertDialogPortal>
        <AlertDialog.Backdrop className="fixed inset-0 z-[80] bg-foreground/30 backdrop-blur-[2px]" />
        <AlertDialog.Viewport className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <AlertDialog.Popup className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl outline-none">
            <AlertDialog.Title className="text-xl font-semibold">현재 입력값을 바꿀까요?</AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-muted-foreground">현재 화면의 측정값과 비고를 선택한 이력의 값으로 바꿔요. 아직 저장하지 않은 값은 되돌릴 수 없습니다.</AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-3"><AlertDialog.Close className="inline-flex h-11 items-center rounded-xl bg-secondary px-5 font-semibold">취소</AlertDialog.Close><Button onClick={() => { if (pendingHistoryRun) applyHistory(pendingHistoryRun); }} type="button">불러오기</Button></div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </WorkspaceAlertDialogPortal>
    </AlertDialog.Root>
    <AlertDialog.Root open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
      <WorkspaceAlertDialogPortal>
        <AlertDialog.Backdrop className="fixed inset-0 z-[80] bg-foreground/30 backdrop-blur-[2px]" />
        <AlertDialog.Viewport className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <AlertDialog.Popup className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl outline-none">
            <AlertDialog.Title className="text-xl font-semibold">입력한 측정값을 초기화할까요?</AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-muted-foreground">현재 화면의 측정값과 비고만 빈칸으로 바꿔요. 저장된 이력은 삭제되지 않습니다.</AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-3"><AlertDialog.Close className="inline-flex h-12 items-center rounded-xl bg-secondary px-5 font-semibold">취소</AlertDialog.Close><Button onClick={resetMeasurementInput} type="button">초기화</Button></div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </WorkspaceAlertDialogPortal>
    </AlertDialog.Root>
  </div>
  </div>;
}
