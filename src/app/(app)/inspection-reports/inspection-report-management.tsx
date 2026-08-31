"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, Expand, FilePlus2, MapPin, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { SearchConditions } from "@/components/ui/search-conditions";
import { Select } from "@/components/ui/select";
import { WorkspaceAlertDialogPortal, WorkspaceDialogPortal } from "@/components/ui/workspace-portal";
import { useSaveFormShortcut } from "@/hooks/use-save-form-shortcut";
import { cn } from "@/lib/utils";

import { deleteInspectionReport, getInspectionToleranceRanges, saveInspectionReport, searchInspectionReports } from "./actions";
import { InspectionMarkerImage, type InspectionMarker } from "./inspection-marker-image";
import { InspectionMarkerPositionDialog } from "./inspection-marker-position-dialog";
import { ItemDetailCombobox } from "./item-detail-combobox";
import { PartyAutocomplete } from "./party-autocomplete";
import { ToleranceAutocomplete } from "./tolerance-autocomplete";
import type { InspectionReport, InspectionReportActionState, InspectionReportData, InspectionReportDraftItem, InspectionReportPage, InspectionReportQuery, InspectionToleranceRange, InspectionToleranceRangeResult } from "./types";

const initialActionState: InspectionReportActionState = { status: "idle" };
const inputClass = "h-11 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20";

function blankItem(): InspectionReportDraftItem {
  return { nominalDimension: "", toleranceMin: "", toleranceMax: "", results: Array(10).fill(""), note: "", markerXRatio: null, markerYRatio: null, isDirectCode: false };
}

function numberText(value: number | string | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function firstDimensionNumber(value: string) {
  const match = value.match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function matchingTolerance(ranges: InspectionToleranceRange[], value: string) {
  const number = firstDimensionNumber(value);
  return number === null ? null : ranges.find((range) => number > Number(range.nominal_min) && number <= Number(range.nominal_max)) ?? null;
}

function Field({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return <label className={cn("grid gap-2 text-sm font-semibold", className)}><span>{label}</span>{children}</label>;
}

function FullscreenImage({ label, markers, onClose, url }: { label: string; markers: InspectionMarker[]; onClose: () => void; url: string }) {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <WorkspaceDialogPortal>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-foreground/90 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
          <Dialog.Popup className="relative size-full outline-none">
            <Dialog.Title className="sr-only">{label} 이미지 전체 화면 보기</Dialog.Title>
            <Dialog.Description className="sr-only">이미지를 원본 비율로 화면에 맞춰 표시해요.</Dialog.Description>
            <InspectionMarkerImage alt={`${label} 이미지`} markers={markers} url={url} />
            <Dialog.Close aria-label="전체 화면 닫기" className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-full bg-background text-foreground shadow-lg sm:right-3 sm:top-3"><X aria-hidden="true" /></Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </WorkspaceDialogPortal>
    </Dialog.Root>
  );
}

function ReportEditor({ data, onOpenChange, onSaved, open, report }: { data: InspectionReportData; onOpenChange: (open: boolean) => void; onSaved: (reportSeq?: number) => void; open: boolean; report: InspectionReport | null }) {
  const [state, formAction, pending] = useActionState(saveInspectionReport, initialActionState);
  const onSaveFormKeyDown = useSaveFormShortcut();
  const initialProductTypeCodeSeq = report
    ? report.product_type_code_seq
    : data.codes.find((code) => code.group_code === "U0002" && code.code_name.trim() === "초도품")?.seq ?? null;
  const [itemDetailSeq, setItemDetailSeq] = useState(report ? String(report.item_detail_seq) : "");
  const [productTypeCodeSeq, setProductTypeCodeSeq] = useState(initialProductTypeCodeSeq ? String(initialProductTypeCodeSeq) : "");
  const [sampleCount, setSampleCount] = useState(report?.sample_count ? String(report.sample_count) : "");
  const [fullscreen, setFullscreen] = useState(false);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [structureChangeConfirmOpen, setStructureChangeConfirmOpen] = useState(false);
  const [editorStep, setEditorStep] = useState<"basic" | "items">("basic");
  const formRef = useRef<HTMLFormElement>(null);
  const structureChangeConfirmedRef = useRef(false);
  const initialItems = useMemo(() => {
    if (!report) return [];
    return data.items.filter((item) => item.inspection_report_seq === report.seq).map((item) => {
      const measurement = data.measurements.find((value) => value.inspection_report_item_seq === item.seq);
      return {
        seq: item.seq,
        nominalDimension: numberText(item.nominal_dimension), toleranceMin: numberText(item.tolerance_min), toleranceMax: numberText(item.tolerance_max),
        results: Array.from({ length: 10 }, (_, index) => numberText(measurement?.[`result_${index + 1}` as keyof typeof measurement] as number | null | undefined)),
        note: measurement?.note ?? "",
        markerXRatio: item.marker_x_ratio,
        markerYRatio: item.marker_y_ratio,
        isDirectCode: false,
      };
    });
  }, [data.items, data.measurements, report]);
  const [rows, setRows] = useState<InspectionReportDraftItem[]>(initialItems);
  const [toleranceModes, setToleranceModes] = useState<("auto" | "manual")[]>(() => initialItems.map(() => "auto"));
  const [toleranceResult, setToleranceResult] = useState<InspectionToleranceRangeResult>({ ranges: [], error: null });
  const [isTolerancePending, startToleranceTransition] = useTransition();
  const selectedItem = data.itemOptions.find((item) => item.seq === Number(itemDetailSeq));
  const partyOptions = data.codes.filter((code) => code.group_code === "U0001");
  const productTypes = data.codes.filter((code) => code.group_code === "U0002");
  const toleranceCodeNames = data.codes
    .filter((code) => code.group_code === "U0003")
    .sort((left, right) => left.code_name.localeCompare(right.code_name, "ko-KR", { numeric: true }))
    .map((code) => code.code_name);
  const markers = rows.flatMap((row, index) => row.markerXRatio === null || row.markerYRatio === null ? [] : [{ x: row.markerXRatio, y: row.markerYRatio, label: index + 1 }]);
  const hasSavedMeasurements = initialItems.some((item) => item.results.some((result) => result.trim() !== "") || item.note.trim() !== "");
  const structureChanged = initialItems.length !== rows.length || rows.some((row, index) => {
    const initial = initialItems[index];
    return !initial
      || initial.nominalDimension.trim() !== row.nominalDimension.trim()
      || Number(initial.toleranceMin) !== Number(row.toleranceMin)
      || Number(initial.toleranceMax) !== Number(row.toleranceMax);
  });

  useEffect(() => { if (state.status === "success") { onOpenChange(false); onSaved(state.reportSeq); } }, [onOpenChange, onSaved, state.reportSeq, state.status]);

  useEffect(() => {
    const seq = Number(itemDetailSeq);
    if (!Number.isSafeInteger(seq) || seq <= 0) return;
    let cancelled = false;
    startToleranceTransition(async () => {
      const result = await getInspectionToleranceRanges(seq);
      if (!cancelled) {
        setToleranceResult(result);
        if (!result.error) setRows((current) => current.map((row) => {
          if (row.toleranceMin.trim() || row.toleranceMax.trim()) return row;
          const range = matchingTolerance(result.ranges, row.nominalDimension);
          return range ? { ...row, toleranceMin: String(range.lower_deviation), toleranceMax: String(range.upper_deviation) } : row;
        }));
      }
    });
    return () => { cancelled = true; };
  }, [itemDetailSeq]);

  function updateRow(index: number, update: Partial<InspectionReportDraftItem>) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...update } : row));
  }

  function updateNominalDimension(index: number, value: string) {
    const row = rows[index];
    const auto = toleranceModes[index] === "auto" || !row.toleranceMin.trim() && !row.toleranceMax.trim();
    const range = auto ? matchingTolerance(toleranceResult.ranges, value) : null;
    updateRow(index, {
      nominalDimension: value,
      isDirectCode: true,
      ...(auto ? { toleranceMin: range ? String(range.lower_deviation) : "", toleranceMax: range ? String(range.upper_deviation) : "" } : {}),
    });
    if (auto) setToleranceModes((current) => current.map((mode, rowIndex) => rowIndex === index ? "auto" : mode));
  }

  function selectNominalCode(index: number, codeName: string, range: InspectionToleranceRange) {
    updateRow(index, {
      nominalDimension: codeName,
      toleranceMin: String(range.lower_deviation),
      toleranceMax: String(range.upper_deviation),
      isDirectCode: false,
    });
    setToleranceModes((current) => current.map((mode, rowIndex) => rowIndex === index ? "auto" : mode));
  }

  function updateTolerance(index: number, key: "toleranceMin" | "toleranceMax", value: string) {
    const row = rows[index];
    const nextMin = key === "toleranceMin" ? value : row.toleranceMin;
    const nextMax = key === "toleranceMax" ? value : row.toleranceMax;
    updateRow(index, { [key]: value });
    setToleranceModes((current) => current.map((mode, rowIndex) => rowIndex === index ? !nextMin.trim() && !nextMax.trim() ? "auto" : "manual" : mode));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <WorkspaceDialogPortal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px]" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5">
          <Dialog.Popup className="flex h-[calc(100svh-1rem)] w-full max-w-[1500px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl outline-none sm:h-[calc(100svh-2.5rem)]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
              <div><Dialog.Title className="text-xl font-semibold">{report ? "검사성적서 수정" : "검사성적서 등록"}</Dialog.Title><Dialog.Description className="mt-2 text-sm text-muted-foreground">기본정보와 측정에 사용할 검사항목을 입력해 주세요.</Dialog.Description></div>
              <Dialog.Close aria-label="닫기" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-accent"><X aria-hidden="true" /></Dialog.Close>
            </div>

            <div aria-label="성적서 입력 단계" className="flex shrink-0 gap-1 border-b border-border px-4 pt-2 sm:px-6" role="tablist">
              <button aria-controls="report-editor-basic" aria-selected={editorStep === "basic"} className={cn("min-h-11 border-b-2 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", editorStep === "basic" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} id="report-editor-tab-basic" onClick={() => setEditorStep("basic")} onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); setEditorStep("items"); } }} role="tab" type="button">1. 기본정보</button>
              <button aria-controls="report-editor-items" aria-selected={editorStep === "items"} className={cn("min-h-11 border-b-2 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", editorStep === "items" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} id="report-editor-tab-items" onClick={() => setEditorStep("items")} onKeyDown={(event) => { if (event.key === "ArrowLeft") { event.preventDefault(); setEditorStep("basic"); } }} role="tab" type="button">2. 검사항목 · 순번 ({rows.length})</button>
            </div>

            <form action={formAction} className="flex min-h-0 flex-1 flex-col" onKeyDown={onSaveFormKeyDown} onSubmit={(event) => {
              if (report && hasSavedMeasurements && structureChanged && !structureChangeConfirmedRef.current) {
                event.preventDefault();
                setStructureChangeConfirmOpen(true);
              }
            }} ref={formRef}>
              <input name="seq" type="hidden" value={report?.seq ?? ""} />
              <input name="items" type="hidden" value={JSON.stringify(rows)} />
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <section aria-labelledby="report-editor-tab-basic" className={cn("mx-auto max-w-6xl", editorStep !== "basic" && "hidden")} id="report-editor-basic" role="tabpanel">
                <div className="mb-5 flex items-center justify-between gap-3"><div><h3 className="font-semibold">성적서 기본정보</h3><p className="mt-1 text-sm text-muted-foreground">품목상세를 선택하고 필요한 정보만 입력해요.</p></div><Button onClick={() => setEditorStep("items")} type="button" variant="secondary">다음: 검사항목</Button></div>
                <div className="grid gap-4 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                  <div className="grid gap-2 text-sm font-semibold sm:col-span-2 lg:col-span-3">
                    <label htmlFor="report-item-detail">품목상세</label>
                    <ItemDetailCombobox
                      id="report-item-detail"
                      onValueChange={(next) => {
                        if (next !== itemDetailSeq) {
                          setRows((current) => current.map((row, index) => ({ ...row, markerXRatio: null, markerYRatio: null, ...(toleranceModes[index] === "auto" ? { toleranceMin: "", toleranceMax: "" } : {}) })));
                          setToleranceResult({ ranges: [], error: null });
                        }
                        setItemDetailSeq(next);
                      }}
                      options={data.itemOptions}
                      value={itemDetailSeq}
                    />
                  </div>
                  <Field label="기종"><input className={cn(inputClass, "bg-muted")} readOnly value={selectedItem?.model_name ?? report?.model_name ?? ""} /></Field>
                  <Field label="품명"><input className={cn(inputClass, "bg-muted")} readOnly value={selectedItem?.item_name ?? ""} /></Field>
                  <Field label="재질"><input className={cn(inputClass, "bg-muted")} readOnly value={selectedItem?.material ?? ""} /></Field>
                  <Field label="고객명"><PartyAutocomplete ariaLabel="고객명" defaultValue={report?.customer_name ?? ""} name="customerName" options={partyOptions} /></Field>
                  <Field label="업체명"><PartyAutocomplete ariaLabel="업체명" defaultValue={report?.supplier_name ?? ""} name="supplierName" options={partyOptions} /></Field>
                  <Field label="납품수량"><input className={inputClass} defaultValue={report?.delivery_quantity ?? ""} min={1} name="deliveryQuantity" type="number" /></Field>
                  <Field label="시료수"><input className={inputClass} max={10} min={1} name="sampleCount" type="number" value={sampleCount} onChange={(event) => setSampleCount(event.target.value)} /></Field>
                  <Field label="제품구분"><Select aria-label="제품구분" className="h-11" name="productTypeCodeSeq" onValueChange={setProductTypeCodeSeq} options={[{ label: "선택 안 함", value: "" }, ...productTypes.map((code) => ({ label: code.code_name, value: String(code.seq) }))]} value={productTypeCodeSeq} /></Field>
                  <Field label="경도"><input className={inputClass} defaultValue={report?.hardness ?? ""} maxLength={100} name="hardness" /></Field>
                  <Field label="열처리"><input className={inputClass} defaultValue={report?.heat_treatment ?? ""} maxLength={100} name="heatTreatment" /></Field>
                </div>
              </section>

              <section aria-labelledby="report-editor-tab-items" className={cn("grid min-h-[440px] gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(560px,1.2fr)]", editorStep !== "items" && "hidden")} id="report-editor-items" role="tabpanel">
                <div><h3 className="font-semibold" id="report-drawing-title">도면 / 제품 이미지</h3><p className="mt-1 text-sm text-muted-foreground">등록된 순번 위치를 함께 확인해요.</p><div className="relative mt-3 flex h-[360px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/30 xl:h-[calc(100svh-19rem)] xl:min-h-[360px]">{selectedItem?.image_url ? <><InspectionMarkerImage alt={`${selectedItem.item_detail_name} 이미지`} markers={markers} url={selectedItem.image_url} /><button aria-label="이미지 전체 화면 보기" className="absolute right-3 top-3 z-20 inline-flex size-11 items-center justify-center rounded-full bg-background shadow" onClick={() => setFullscreen(true)} type="button"><Expand aria-hidden="true" /></button></> : <p className="px-5 text-center text-sm text-muted-foreground">기본정보에서 품목상세를 선택해 주세요.</p>}</div></div>
                <input name="finalJudgmentCodeSeq" type="hidden" value={report?.final_judgment_code_seq ?? ""} />

                <div className="flex min-h-0 min-w-0 flex-col"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold" id="measurements-title">검사항목</h3><p className="mt-1 text-sm text-muted-foreground">기준치수의 숫자에 맞는 공차를 자동으로 입력해요.</p><p aria-live="polite" className={cn("mt-1 text-xs", toleranceResult.error ? "text-destructive" : "text-muted-foreground")}>{isTolerancePending ? "오차범위를 불러오는 중이에요." : toleranceResult.error ?? (itemDetailSeq && toleranceResult.ranges.length === 0 ? "등록된 오차범위가 없어 수동으로 입력해 주세요." : "")}</p></div><div className="flex flex-wrap gap-2"><Button disabled={!selectedItem?.image_url || rows.length === 0} onClick={() => setMarkerDialogOpen(true)} type="button" variant="secondary"><MapPin aria-hidden="true" />순번 위치 설정</Button><Button onClick={() => { setRows((current) => [...current, blankItem()]); setToleranceModes((current) => [...current, "auto"]); }} type="button" variant="secondary"><Plus aria-hidden="true" />항목 추가</Button></div></div>
                <div className="mt-3 max-h-[420px] overflow-auto border-y border-border xl:max-h-[calc(100svh-19rem)]"><table className="w-full min-w-[560px] border-collapse text-sm"><thead className="sticky top-0 z-10 bg-muted"><tr><th className="w-14 p-3">순번</th><th className="p-3">기준치수</th><th className="p-3">공차 min</th><th className="p-3">공차 max</th><th className="w-14 p-3"><span className="sr-only">삭제</span></th></tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr className="border-t border-border bg-background" key={row.seq ?? `new-${rowIndex}`}><td className="p-2 text-center font-medium">{rowIndex + 1}</td><td className="p-1"><ToleranceAutocomplete codeNames={toleranceCodeNames} onOptionSelect={(codeName, range) => selectNominalCode(rowIndex, codeName, range)} onValueChange={(value) => updateNominalDimension(rowIndex, value)} ranges={toleranceResult.ranges} rowNumber={rowIndex + 1} value={row.nominalDimension} /></td>{(["toleranceMin", "toleranceMax"] as const).map((key) => <td className="p-1" key={key}><input aria-label={`${rowIndex + 1}번 ${key}`} className={cn(inputClass, "h-10 px-2 text-right tabular-nums")} inputMode="decimal" value={row[key]} onChange={(event) => updateTolerance(rowIndex, key, event.target.value)} /></td>)}<td className="p-1"><button aria-label={`${rowIndex + 1}번 항목 삭제`} className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => { setRows((current) => current.filter((_, index) => index !== rowIndex)); setToleranceModes((current) => current.filter((_, index) => index !== rowIndex)); }} type="button"><Trash2 aria-hidden="true" size={18} /></button></td></tr>) : <tr><td className="p-8 text-center text-muted-foreground" colSpan={5}>등록된 검사항목이 없어요. 항목 추가를 눌러 시작해 주세요.</td></tr>}</tbody></table></div></div>
              </section>
              </div>

              <div className="flex min-h-16 shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border bg-background px-4 py-2 sm:px-6">{state.message ? <p className={cn("mr-auto text-sm", state.status === "error" ? "text-destructive" : "text-primary")} role="status">{state.message}</p> : <span className="mr-auto text-sm text-muted-foreground">기본정보와 검사항목을 함께 저장해요.</span>}<Dialog.Close className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>취소</Dialog.Close><Button data-save-submit="true" disabled={pending} type="submit">{pending ? "저장 중..." : report ? "수정 저장" : "등록"}</Button></div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </WorkspaceDialogPortal>
      {fullscreen && selectedItem?.image_url ? <FullscreenImage label={selectedItem.item_detail_name} markers={markers} onClose={() => setFullscreen(false)} url={selectedItem.image_url} /> : null}
      {markerDialogOpen && selectedItem?.image_url ? <InspectionMarkerPositionDialog imageLabel={selectedItem.item_detail_name} imageUrl={selectedItem.image_url} onApply={(positions) => setRows((current) => current.map((row, index) => ({ ...row, ...positions[index] })))} onOpenChange={setMarkerDialogOpen} open={markerDialogOpen} rows={rows} /> : null}
      <AlertDialog.Root open={structureChangeConfirmOpen} onOpenChange={setStructureChangeConfirmOpen}>
        <WorkspaceAlertDialogPortal>
          <AlertDialog.Backdrop className="fixed inset-0 z-[80] bg-foreground/30 backdrop-blur-[2px]" />
          <AlertDialog.Viewport className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <AlertDialog.Popup className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl outline-none">
              <AlertDialog.Title className="text-xl font-semibold">검사항목 구조를 변경할까요?</AlertDialog.Title>
              <AlertDialog.Description className="mt-3 text-muted-foreground">현재 입력된 측정결과는 결과입력 화면에서 초기화돼요. 기존 결과와 당시 검사항목은 측정이력에 그대로 유지됩니다.</AlertDialog.Description>
              <div className="mt-6 flex justify-end gap-3">
                <AlertDialog.Close className="inline-flex h-11 items-center rounded-xl bg-secondary px-5 font-semibold">취소</AlertDialog.Close>
                <Button onClick={() => {
                  structureChangeConfirmedRef.current = true;
                  setStructureChangeConfirmOpen(false);
                  formRef.current?.requestSubmit();
                  queueMicrotask(() => { structureChangeConfirmedRef.current = false; });
                }} type="button">이력 유지하고 변경</Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </WorkspaceAlertDialogPortal>
      </AlertDialog.Root>
    </Dialog.Root>
  );
}

function DeleteReportDialog({ onDeleted, onOpenChange, open, report }: { onDeleted: () => void; onOpenChange: (open: boolean) => void; open: boolean; report: InspectionReport }) {
  const [state, action, pending] = useActionState(deleteInspectionReport, initialActionState);
  useEffect(() => { if (state.status === "success") { onOpenChange(false); onDeleted(); } }, [onDeleted, onOpenChange, state.status]);
  return <AlertDialog.Root open={open} onOpenChange={onOpenChange}><WorkspaceAlertDialogPortal><AlertDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px]" /><AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4"><AlertDialog.Popup className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl outline-none"><AlertDialog.Title className="text-xl font-semibold">검사성적서를 삭제할까요?</AlertDialog.Title><AlertDialog.Description className="mt-3 text-muted-foreground">#{report.seq} 검사성적서와 모든 측정결과가 삭제되며 되돌릴 수 없어요.</AlertDialog.Description><form action={action} className="mt-6"><input name="seq" type="hidden" value={report.seq} />{state.message ? <p className="mb-4 text-sm text-destructive" role="alert">{state.message}</p> : null}<div className="flex justify-end gap-3"><AlertDialog.Close className="inline-flex h-11 items-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>취소</AlertDialog.Close><Button disabled={pending} variant="destructive">{pending ? "삭제 중..." : "삭제"}</Button></div></form></AlertDialog.Popup></AlertDialog.Viewport></WorkspaceAlertDialogPortal></AlertDialog.Root>;
}

export function InspectionReportManagement({ data, initialPage }: { data: InspectionReportData; initialPage: InspectionReportPage }) {
  const [pageResult, setPageResult] = useState(initialPage);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(initialPage.rows[0]?.seq ?? null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<InspectionReport | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const [searchField, setSearchField] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [appliedQuery, setAppliedQuery] = useState<InspectionReportQuery>({ searchField: "all", keyword: "", sortOrder: "newest", page: 1 });
  const [isSearching, startSearchTransition] = useTransition();
  const [detailTab, setDetailTab] = useState<"basic" | "inspection">("basic");
  const itemCountByReport = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of data.items) counts.set(item.inspection_report_seq, (counts.get(item.inspection_report_seq) ?? 0) + 1);
    return counts;
  }, [data.items]);
  const totalPages = Math.max(1, Math.ceil(pageResult.total / pageResult.pageSize));
  const currentPage = Math.min(pageResult.page, totalPages);
  const visibleReports = pageResult.rows;
  const selected = visibleReports.find((report) => report.seq === selectedSeq) ?? visibleReports[0] ?? null;
  const selectedItem = selected ? {
    seq: selected.item_detail_seq,
    item_detail_code: selected.item_detail_code,
    item_detail_name: selected.item_detail_name,
    material: selected.material,
    image_url: selected.image_url,
    item_name: selected.item_name,
    model_name: selected.model_name,
  } : null;
  const selectedItems = selected ? data.items.filter((item) => item.inspection_report_seq === selected.seq) : [];
  const selectedMarkers = selectedItems.flatMap((item) => item.marker_x_ratio === null || item.marker_y_ratio === null ? [] : [{ x: item.marker_x_ratio, y: item.marker_y_ratio, label: item.sort_order }]);

  function openNew() { setEditingReport(null); setEditorOpen(true); }
  function openEdit(report = selected) { if (!report) return; setEditingReport(report); setEditorOpen(true); }
  function selectReport(report: InspectionReport) { setSelectedSeq(report.seq); setDetailTab("basic"); }

  const loadReports = useCallback((query: InspectionReportQuery, preferredSeq?: number) => {
    startSearchTransition(async () => {
      const result = await searchInspectionReports(query);
      setPageResult(result);
      if (!result.error) {
        setAppliedQuery(query);
        setSelectedSeq(result.rows.some((report) => report.seq === preferredSeq) ? preferredSeq ?? null : result.rows[0]?.seq ?? null);
      }
    });
  }, []);

  const refreshReports = useCallback((preferredSeq?: number) => {
    loadReports({ ...appliedQuery, page: 1 }, preferredSeq);
  }, [appliedQuery, loadReports]);

  if (data.hasError) return <div className="rounded-3xl border border-border bg-card p-6" role="alert"><h2 className="text-lg font-semibold">검사성적서를 불러오지 못했어요</h2><p className="mt-2 text-muted-foreground">잠시 후 다시 시도해 주세요.</p></div>;

  return <div className="flex min-h-0 flex-col gap-4">
    <SearchConditions summary={`검색 ${pageResult.total}건`}>
      <form className="flex flex-col gap-3 p-3 @min-[768px]/workspace:flex-row @min-[768px]/workspace:items-end" onSubmit={(event) => { event.preventDefault(); loadReports({ searchField: searchField as InspectionReportQuery["searchField"], keyword: keyword.trim(), sortOrder: sortOrder as InspectionReportQuery["sortOrder"], page: 1 }); }}>
        <label className="grid w-full gap-1.5 text-sm font-medium @min-[768px]/workspace:w-44"><span>검색 유형</span><Select aria-label="검색 유형" className="h-12" onValueChange={setSearchField} options={[{ label: "통합검색", value: "all" }, { label: "기종", value: "model" }, { label: "품번/도번", value: "drawing" }, { label: "품명", value: "itemName" }, { label: "고객명", value: "customer" }, { label: "업체명", value: "supplier" }]} value={searchField} /></label>
        <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-medium"><span>검색어</span><span className="relative"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="h-12 w-full rounded-sm border border-input bg-background pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={100} onChange={(event) => setKeyword(event.target.value)} placeholder="검색어를 입력해 주세요" type="search" value={keyword} /></span></label>
        <label className="grid w-full gap-1.5 text-sm font-medium @min-[768px]/workspace:w-36"><span>정렬</span><Select aria-label="정렬" className="h-12" onValueChange={setSortOrder} options={[{ label: "최신순", value: "newest" }, { label: "오래된순", value: "oldest" }]} value={sortOrder} /></label>
        <div className="flex shrink-0 items-center gap-2 @min-[768px]/workspace:ml-auto"><Button onClick={() => { setSearchField("all"); setKeyword(""); setSortOrder("newest"); loadReports({ searchField: "all", keyword: "", sortOrder: "newest", page: 1 }); }} type="button" variant="secondary"><RotateCcw aria-hidden="true" />초기화</Button><Button disabled={isSearching} type="submit"><Search aria-hidden="true" />{isSearching ? "조회 중" : "조회"}</Button></div>
      </form>
    </SearchConditions>
    {pageResult.error ? <p className="text-sm text-destructive" role="alert">{pageResult.error}</p> : null}
    <div className="grid min-h-[680px] gap-4 @min-[1024px]/workspace:h-[calc(100svh-250px)] @min-[1024px]/workspace:min-h-0 @min-[1024px]/workspace:grid-cols-[340px_minmax(0,1fr)] @min-[1280px]/workspace:grid-cols-[380px_minmax(0,1fr)]">
      <section aria-labelledby="report-list-title" className="flex min-h-0 min-w-0 flex-col overflow-hidden border-y border-border">
        <div className="flex min-h-14 items-center justify-between gap-3 bg-muted/70 px-3 py-2"><div><h2 className="font-semibold" id="report-list-title">성적서 목록</h2><span className="text-xs text-muted-foreground">{currentPage} / {totalPages} 페이지</span></div><Button onClick={openNew} size="sm" type="button"><FilePlus2 aria-hidden="true" />등록</Button></div>
        <div className="min-h-0 flex-1 overflow-y-auto">{visibleReports.length ? <div className="divide-y divide-border">{visibleReports.map((report) => { const selectedRow = selected?.seq === report.seq; return <button aria-pressed={selectedRow} className={cn("block min-h-[68px] w-full px-4 py-2.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", selectedRow && "bg-primary/10 hover:bg-primary/10")} key={report.seq} onClick={() => selectReport(report)} onDoubleClick={() => openEdit(report)} type="button"><span className="flex items-center justify-between gap-3"><strong className="truncate text-sm">{report.item_detail_code}</strong><span className={cn("shrink-0 text-xs tabular-nums", selectedRow ? "font-semibold text-primary" : "text-muted-foreground")}>#{report.seq}</span></span><span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><span className="truncate">{report.model_name} · {report.item_name}</span><span aria-hidden="true">·</span><span className="shrink-0">{itemCountByReport.get(report.seq) ?? 0}항목</span></span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{report.customer_name || "고객명 미입력"}</span></button>; })}</div> : <p className="px-4 py-16 text-center text-sm text-muted-foreground">{data.reports.length ? "검색 결과가 없어요." : "등록된 검사성적서가 없어요."}</p>}</div>
        <div className="flex min-h-14 items-center justify-between gap-2 border-t border-border px-3"><span className="text-xs text-muted-foreground">페이지당 최대 {pageResult.pageSize}건</span><div className="flex gap-2"><Button aria-label="이전 페이지" disabled={isSearching || currentPage <= 1} onClick={() => loadReports({ ...appliedQuery, page: currentPage - 1 })} size="sm" variant="secondary"><ChevronLeft aria-hidden="true" />이전</Button><Button aria-label="다음 페이지" disabled={isSearching || currentPage >= totalPages} onClick={() => loadReports({ ...appliedQuery, page: currentPage + 1 })} size="sm" variant="secondary">다음<ChevronRight aria-hidden="true" /></Button></div></div>
      </section>
      <section aria-labelledby="report-detail-title" className="flex min-h-0 min-w-0 flex-col overflow-hidden border-y border-border">
        <div className="flex min-h-16 items-center justify-between gap-3 bg-muted/70 px-4 py-2"><div className="min-w-0"><h2 className="truncate font-semibold" id="report-detail-title">{selected ? `${selected.item_detail_code} · ${selectedItem?.item_name || selected.model_name}` : "성적서 정보"}</h2>{selected ? <p className="mt-0.5 truncate text-xs text-muted-foreground">#{selected.seq} · {selected.model_name}{selected.customer_name ? ` · ${selected.customer_name}` : ""}</p> : null}</div>{selected ? <div className="flex shrink-0 gap-2"><Button onClick={() => openEdit()} size="sm" variant="secondary"><Pencil aria-hidden="true" />수정</Button><Button onClick={() => setDeleteOpen(true)} size="sm" variant="secondary"><Trash2 aria-hidden="true" />삭제</Button></div> : null}</div>
        {selected ? <><div aria-label="성적서 상세 구분" className="flex shrink-0 border-b border-border px-4" role="tablist"><button aria-selected={detailTab === "basic"} className={cn("min-h-11 border-b-2 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", detailTab === "basic" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setDetailTab("basic")} role="tab" type="button">기본정보</button><button aria-selected={detailTab === "inspection"} className={cn("min-h-11 border-b-2 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", detailTab === "inspection" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setDetailTab("inspection")} role="tab" type="button">도면·검사항목 <span className="ml-1 text-xs">{selectedItems.length}</span></button></div><div className="min-h-0 flex-1 overflow-y-auto p-4 @min-[640px]/workspace:p-5">
          {detailTab === "basic" ? <dl className="grid gap-x-6 gap-y-5 @min-[640px]/workspace:grid-cols-2 @min-[1280px]/workspace:grid-cols-3">{[
            ["기종", selected.model_name], ["품목코드", selected.item_code], ["품목상세코드", selected.item_detail_code], ["품명", selected.item_name], ["품목상세명", selected.item_detail_name], ["재질", selected.material ?? ""],
            ["고객명", selected.customer_name ?? ""], ["업체명", selected.supplier_name ?? ""], ["납품수량", selected.delivery_quantity?.toLocaleString() ?? ""],
            ["시료수", selected.sample_count ?? ""], ["제품구분", selected.product_type_name ?? ""],
            ["경도", selected.hardness ?? ""], ["열처리", selected.heat_treatment ?? ""],
          ].map(([label, value]) => <div className="min-w-0 border-b border-border pb-3" key={label}><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className={cn("mt-1.5 min-h-5 break-words text-sm", value ? "font-medium text-foreground" : "text-muted-foreground")}>{value || "미입력"}</dd></div>)}</dl> : <div className="grid gap-5 @min-[768px]/workspace:grid-cols-[minmax(220px,0.75fr)_minmax(0,1.25fr)]">
            <div><h3 className="text-sm font-semibold">도면 / 제품 이미지</h3><div className="relative mt-3 flex h-64 items-center justify-center overflow-hidden bg-muted/30">{selectedItem?.image_url ? <><InspectionMarkerImage alt={`${selectedItem.item_detail_name} 이미지`} markers={selectedMarkers} url={selectedItem.image_url} /><button aria-label="이미지 전체 화면 보기" className="absolute right-3 top-3 z-20 inline-flex size-11 items-center justify-center rounded-full bg-background shadow" onClick={() => setDetailFullscreen(true)} type="button"><Expand aria-hidden="true" /></button></> : <p className="px-5 text-center text-sm text-muted-foreground">품목상세에 등록된 이미지가 없어요.</p>}</div></div>
            <div className="min-w-0"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">검사항목</h3><span className="text-xs text-muted-foreground">{selectedItems.length}개</span></div><div className="mt-3 max-h-64 overflow-auto border-y border-border"><table className="w-full min-w-[430px] border-collapse text-sm"><thead className="sticky top-0 z-10 bg-muted"><tr><th className="w-16 px-3 py-3 text-center">순번</th><th className="px-3 py-3 text-right">기준치수</th><th className="px-3 py-3 text-right">공차 min</th><th className="px-3 py-3 text-right">공차 max</th></tr></thead><tbody>{selectedItems.length ? selectedItems.map((item) => <tr className="border-t border-border bg-background" key={item.seq}><td className="px-3 py-2.5 text-center tabular-nums">{item.sort_order}</td><td className="px-3 py-2.5 text-right tabular-nums">{numberText(item.nominal_dimension)}</td><td className="px-3 py-2.5 text-right tabular-nums">{numberText(item.tolerance_min)}</td><td className="px-3 py-2.5 text-right tabular-nums">{numberText(item.tolerance_max)}</td></tr>) : <tr><td className="px-4 py-12 text-center text-muted-foreground" colSpan={4}>등록된 검사항목이 없어요.</td></tr>}</tbody></table></div></div>
          </div>}</div></> : <div className="flex min-h-72 items-center justify-center p-6 text-center text-sm text-muted-foreground">왼쪽 목록에서 성적서를 선택해 주세요.</div>}
      </section>
    </div>
    {editorOpen ? <ReportEditor data={data} key={`${editingReport?.seq ?? "new"}-${editorOpen}`} onOpenChange={setEditorOpen} onSaved={refreshReports} open={editorOpen} report={editingReport} /> : null}
    {selected ? <DeleteReportDialog key={`${selected.seq}-${deleteOpen}`} onDeleted={refreshReports} onOpenChange={setDeleteOpen} open={deleteOpen} report={selected} /> : null}
    {detailFullscreen && selectedItem?.image_url ? <FullscreenImage label={selectedItem.item_detail_name} markers={selectedMarkers} onClose={() => setDetailFullscreen(false)} url={selectedItem.image_url} /> : null}
  </div>;
}
