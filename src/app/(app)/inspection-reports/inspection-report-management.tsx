"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { Expand, FilePlus2, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { deleteInspectionReport, saveInspectionReport } from "./actions";
import { InspectionMarkerImage, type InspectionMarker } from "./inspection-marker-image";
import { InspectionMarkerPositionDialog } from "./inspection-marker-position-dialog";
import type { InspectionReport, InspectionReportActionState, InspectionReportData, InspectionReportDraftItem } from "./types";

const initialActionState: InspectionReportActionState = { status: "idle" };
const inputClass = "h-11 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20";

function blankItem(): InspectionReportDraftItem {
  return { nominalDimension: "", toleranceMin: "", toleranceMax: "", results: Array(10).fill(""), note: "", markerXRatio: null, markerYRatio: null };
}

function numberText(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function Field({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return <label className={cn("grid gap-2 text-sm font-semibold", className)}><span>{label}</span>{children}</label>;
}

function FullscreenImage({ label, markers, onClose, url }: { label: string; markers: InspectionMarker[]; onClose: () => void; url: string }) {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-foreground/90 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
          <Dialog.Popup className="relative size-full outline-none">
            <Dialog.Title className="sr-only">{label} 이미지 전체 화면 보기</Dialog.Title>
            <Dialog.Description className="sr-only">이미지를 원본 비율로 화면에 맞춰 표시해요.</Dialog.Description>
            <InspectionMarkerImage alt={`${label} 이미지`} markers={markers} url={url} />
            <Dialog.Close aria-label="전체 화면 닫기" className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-full bg-background text-foreground shadow-lg sm:right-3 sm:top-3"><X aria-hidden="true" /></Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ReportEditor({ data, onOpenChange, open, report }: { data: InspectionReportData; onOpenChange: (open: boolean) => void; open: boolean; report: InspectionReport | null }) {
  const [state, formAction, pending] = useActionState(saveInspectionReport, initialActionState);
  const [itemDetailSeq, setItemDetailSeq] = useState(report ? String(report.item_detail_seq) : "");
  const [productTypeCodeSeq, setProductTypeCodeSeq] = useState(report?.product_type_code_seq ? String(report.product_type_code_seq) : "");
  const [sampleCount, setSampleCount] = useState(report?.sample_count ? String(report.sample_count) : "");
  const [fullscreen, setFullscreen] = useState(false);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [editorStep, setEditorStep] = useState<"basic" | "items">("basic");
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
      };
    });
  }, [data.items, data.measurements, report]);
  const [rows, setRows] = useState<InspectionReportDraftItem[]>(initialItems);
  const selectedItem = data.itemOptions.find((item) => item.seq === Number(itemDetailSeq));
  const productTypes = data.codes.filter((code) => code.group_code === "U0002");
  const markers = rows.flatMap((row, index) => row.markerXRatio === null || row.markerYRatio === null ? [] : [{ x: row.markerXRatio, y: row.markerYRatio, label: index + 1 }]);

  useEffect(() => { if (state.status === "success") onOpenChange(false); }, [onOpenChange, state.status]);

  function updateRow(index: number, update: Partial<InspectionReportDraftItem>) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...update } : row));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
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

            <form action={formAction} className="flex min-h-0 flex-1 flex-col">
              <input name="seq" type="hidden" value={report?.seq ?? ""} />
              <input name="items" type="hidden" value={JSON.stringify(rows)} />
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <section aria-labelledby="report-editor-tab-basic" className={cn("mx-auto max-w-6xl", editorStep !== "basic" && "hidden")} id="report-editor-basic" role="tabpanel">
                <div className="mb-5 flex items-center justify-between gap-3"><div><h3 className="font-semibold">성적서 기본정보</h3><p className="mt-1 text-sm text-muted-foreground">품목상세를 선택하고 필요한 정보만 입력해요.</p></div><Button onClick={() => setEditorStep("items")} type="button" variant="secondary">다음: 검사항목</Button></div>
                <div className="grid gap-4 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                  <Field className="sm:col-span-2 lg:col-span-3" label="품목상세"><Select aria-label="품목상세" className="h-11" name="itemDetailSeq" onValueChange={(next) => { if (next !== itemDetailSeq) setRows((current) => current.map((row) => ({ ...row, markerXRatio: null, markerYRatio: null }))); setItemDetailSeq(next); }} options={[{ label: "품목상세를 선택해 주세요", value: "" }, ...data.itemOptions.map((item) => ({ label: `${item.item_detail_code} · ${item.item_detail_name}`, value: String(item.seq) }))]} value={itemDetailSeq} /></Field>
                  <Field label="기종"><input className={cn(inputClass, "bg-muted")} readOnly value={selectedItem?.model_name ?? report?.model_name ?? ""} /></Field>
                  <Field label="품명"><input className={cn(inputClass, "bg-muted")} readOnly value={selectedItem?.item_name ?? ""} /></Field>
                  <Field label="재질"><input className={cn(inputClass, "bg-muted")} readOnly value={selectedItem?.material ?? ""} /></Field>
                  <Field label="고객명"><input className={inputClass} defaultValue={report?.customer_name ?? ""} maxLength={100} name="customerName" /></Field>
                  <Field label="업체명"><input className={inputClass} defaultValue={report?.supplier_name ?? ""} maxLength={100} name="supplierName" /></Field>
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

                <div className="flex min-h-0 min-w-0 flex-col"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold" id="measurements-title">검사항목</h3><p className="mt-1 text-sm text-muted-foreground">기준치수와 최소·최대 공차를 입력해요.</p></div><div className="flex flex-wrap gap-2"><Button disabled={!selectedItem?.image_url || rows.length === 0} onClick={() => setMarkerDialogOpen(true)} type="button" variant="secondary"><MapPin aria-hidden="true" />순번 위치 설정</Button><Button onClick={() => setRows((current) => [...current, blankItem()])} type="button" variant="secondary"><Plus aria-hidden="true" />항목 추가</Button></div></div>
                <div className="mt-3 max-h-[420px] overflow-auto border-y border-border xl:max-h-[calc(100svh-19rem)]"><table className="w-full min-w-[560px] border-collapse text-sm"><thead className="sticky top-0 z-10 bg-muted"><tr><th className="w-14 p-3">순번</th><th className="p-3">기준치수</th><th className="p-3">공차 min</th><th className="p-3">공차 max</th><th className="w-14 p-3"><span className="sr-only">삭제</span></th></tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr className="border-t border-border bg-background" key={row.seq ?? `new-${rowIndex}`}><td className="p-2 text-center font-medium">{rowIndex + 1}</td>{(["nominalDimension", "toleranceMin", "toleranceMax"] as const).map((key) => <td className="p-1" key={key}><input aria-label={`${rowIndex + 1}번 ${key}`} className={cn(inputClass, "h-10 px-2 text-right tabular-nums")} inputMode="decimal" value={row[key]} onChange={(event) => updateRow(rowIndex, { [key]: event.target.value })} /></td>)}<td className="p-1"><button aria-label={`${rowIndex + 1}번 항목 삭제`} className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => setRows((current) => current.filter((_, index) => index !== rowIndex))} type="button"><Trash2 aria-hidden="true" size={18} /></button></td></tr>) : <tr><td className="p-8 text-center text-muted-foreground" colSpan={5}>등록된 검사항목이 없어요. 항목 추가를 눌러 시작해 주세요.</td></tr>}</tbody></table></div></div>
              </section>
              </div>

              <div className="flex min-h-16 shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border bg-background px-4 py-2 sm:px-6">{state.message ? <p className={cn("mr-auto text-sm", state.status === "error" ? "text-destructive" : "text-primary")} role="status">{state.message}</p> : <span className="mr-auto text-sm text-muted-foreground">기본정보와 검사항목을 함께 저장해요.</span>}<Dialog.Close className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>취소</Dialog.Close><Button disabled={pending} type="submit">{pending ? "저장 중..." : report ? "수정 저장" : "등록"}</Button></div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
      {fullscreen && selectedItem?.image_url ? <FullscreenImage label={selectedItem.item_detail_name} markers={markers} onClose={() => setFullscreen(false)} url={selectedItem.image_url} /> : null}
      {markerDialogOpen && selectedItem?.image_url ? <InspectionMarkerPositionDialog imageLabel={selectedItem.item_detail_name} imageUrl={selectedItem.image_url} onApply={(positions) => setRows((current) => current.map((row, index) => ({ ...row, ...positions[index] })))} onOpenChange={setMarkerDialogOpen} open={markerDialogOpen} rows={rows} /> : null}
    </Dialog.Root>
  );
}

function DeleteReportDialog({ onOpenChange, open, report }: { onOpenChange: (open: boolean) => void; open: boolean; report: InspectionReport }) {
  const [state, action, pending] = useActionState(deleteInspectionReport, initialActionState);
  useEffect(() => { if (state.status === "success") onOpenChange(false); }, [onOpenChange, state.status]);
  return <AlertDialog.Root open={open} onOpenChange={onOpenChange}><AlertDialog.Portal><AlertDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px]" /><AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4"><AlertDialog.Popup className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl outline-none"><AlertDialog.Title className="text-xl font-semibold">검사성적서를 삭제할까요?</AlertDialog.Title><AlertDialog.Description className="mt-3 text-muted-foreground">#{report.seq} 검사성적서와 모든 측정결과가 삭제되며 되돌릴 수 없어요.</AlertDialog.Description><form action={action} className="mt-6"><input name="seq" type="hidden" value={report.seq} />{state.message ? <p className="mb-4 text-sm text-destructive" role="alert">{state.message}</p> : null}<div className="flex justify-end gap-3"><AlertDialog.Close className="inline-flex h-11 items-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>취소</AlertDialog.Close><Button disabled={pending} variant="destructive">{pending ? "삭제 중..." : "삭제"}</Button></div></form></AlertDialog.Popup></AlertDialog.Viewport></AlertDialog.Portal></AlertDialog.Root>;
}

export function InspectionReportManagement({ data }: { data: InspectionReportData }) {
  const [selectedSeq, setSelectedSeq] = useState<number | null>(data.reports[0]?.seq ?? null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<InspectionReport | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const codeMap = useMemo(() => new Map(data.codes.map((code) => [code.seq, code.code_name])), [data.codes]);
  const selected = data.reports.find((report) => report.seq === selectedSeq) ?? null;
  const selectedItem = selected ? data.itemOptions.find((item) => item.seq === selected.item_detail_seq) ?? null : null;
  const selectedItems = selected ? data.items.filter((item) => item.inspection_report_seq === selected.seq) : [];
  const selectedMarkers = selectedItems.flatMap((item) => item.marker_x_ratio === null || item.marker_y_ratio === null ? [] : [{ x: item.marker_x_ratio, y: item.marker_y_ratio, label: item.sort_order }]);

  function openNew() { setEditingReport(null); setEditorOpen(true); }
  function openEdit(report = selected) { if (!report) return; setEditingReport(report); setEditorOpen(true); }

  if (data.hasError) return <div className="rounded-3xl border border-border bg-card p-6" role="alert"><h2 className="text-lg font-semibold">검사성적서를 불러오지 못했어요</h2><p className="mt-2 text-muted-foreground">잠시 후 다시 시도해 주세요.</p></div>;

  return <div className="flex min-h-0 flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">총 <strong className="text-foreground">{data.reports.length}</strong>건이에요.</p><Button onClick={openNew}><FilePlus2 aria-hidden="true" />성적서 등록</Button></div>
    <div className="grid min-h-[620px] gap-4 @min-[1024px]/workspace:h-[calc(100svh-190px)] @min-[1024px]/workspace:min-h-0 @min-[1024px]/workspace:grid-cols-[280px_minmax(0,1fr)] @min-[1280px]/workspace:grid-cols-[310px_minmax(0,1fr)]">
      <section aria-labelledby="report-list-title" className="flex min-h-0 min-w-0 flex-col overflow-hidden border-y border-border">
        <div className="flex items-center justify-between bg-muted/70 px-4 py-3"><h2 className="font-semibold" id="report-list-title">성적서 마스터</h2><span className="text-xs text-muted-foreground">행을 선택해 주세요</span></div>
        <div className="min-h-0 flex-1 overflow-y-auto">{data.reports.length ? <div className="divide-y divide-border">{data.reports.map((report) => { const itemOption = data.itemOptions.find((item) => item.seq === report.item_detail_seq); const selectedRow = selectedSeq === report.seq; return <button aria-pressed={selectedRow} className={cn("block min-h-24 w-full px-4 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", selectedRow && "bg-primary/10 hover:bg-primary/10")} key={report.seq} onClick={() => setSelectedSeq(report.seq)} onDoubleClick={() => openEdit(report)} type="button"><span className="flex items-center justify-between gap-3"><strong className="truncate text-sm">#{report.seq} · {report.item_detail_code}</strong><span className={cn("shrink-0 text-xs font-semibold", selectedRow ? "text-primary" : "text-muted-foreground")}>{report.final_judgment_code_seq ? codeMap.get(report.final_judgment_code_seq) ?? "판정" : "미판정"}</span></span><span className="mt-2 block truncate text-sm text-foreground">{itemOption?.item_name || report.model_name}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{report.model_name}{report.customer_name ? ` · ${report.customer_name}` : ""}</span></button>; })}</div> : <p className="px-4 py-16 text-center text-sm text-muted-foreground">등록된 검사성적서가 없어요.</p>}</div>
      </section>
      <section aria-labelledby="report-detail-title" className="flex min-h-0 min-w-0 flex-col overflow-hidden border-y border-border">
        <div className="flex min-h-14 items-center justify-between gap-3 bg-muted/70 px-4 py-2"><div className="min-w-0"><h2 className="font-semibold" id="report-detail-title">성적서 정보</h2>{selected ? <p className="mt-0.5 truncate text-xs text-muted-foreground">#{selected.seq} · {selected.item_detail_code}</p> : null}</div>{selected ? <div className="flex shrink-0 gap-2"><Button onClick={() => openEdit()} size="sm" variant="secondary"><Pencil aria-hidden="true" />수정</Button><Button onClick={() => setDeleteOpen(true)} size="sm" variant="secondary"><Trash2 aria-hidden="true" />삭제</Button></div> : null}</div>
        {selected ? <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 @min-[640px]/workspace:p-5">
          <dl className="grid gap-x-5 gap-y-3 rounded-2xl bg-muted/35 p-4 @min-[640px]/workspace:grid-cols-2 @min-[1280px]/workspace:grid-cols-3">{[
            ["기종", selected.model_name], ["품목상세코드", selected.item_detail_code], ["품명", selectedItem?.item_name ?? "-"],
            ["고객명", selected.customer_name || "-"], ["업체명", selected.supplier_name || "-"], ["납품수량", selected.delivery_quantity?.toLocaleString() ?? "-"],
            ["시료수", selected.sample_count ?? "-"], ["제품구분", selected.product_type_code_seq ? codeMap.get(selected.product_type_code_seq) ?? "-" : "-"],
            ["경도", selected.hardness || "-"], ["열처리", selected.heat_treatment || "-"], ["최종판정", selected.final_judgment_code_seq ? codeMap.get(selected.final_judgment_code_seq) ?? "-" : "미판정"],
          ].map(([label, value]) => <div className="min-w-0" key={label}><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value}</dd></div>)}</dl>
          <div className="grid gap-5 @min-[768px]/workspace:grid-cols-[minmax(220px,0.75fr)_minmax(0,1.25fr)]">
            <div><h3 className="text-sm font-semibold">도면 / 제품 이미지</h3><div className="relative mt-3 flex h-64 items-center justify-center overflow-hidden bg-muted/30">{selectedItem?.image_url ? <><InspectionMarkerImage alt={`${selectedItem.item_detail_name} 이미지`} markers={selectedMarkers} url={selectedItem.image_url} /><button aria-label="이미지 전체 화면 보기" className="absolute right-3 top-3 z-20 inline-flex size-11 items-center justify-center rounded-full bg-background shadow" onClick={() => setDetailFullscreen(true)} type="button"><Expand aria-hidden="true" /></button></> : <p className="px-5 text-center text-sm text-muted-foreground">품목상세에 등록된 이미지가 없어요.</p>}</div></div>
            <div className="min-w-0"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">검사항목</h3><span className="text-xs text-muted-foreground">{selectedItems.length}개</span></div><div className="mt-3 max-h-64 overflow-auto border-y border-border"><table className="w-full min-w-[430px] border-collapse text-sm"><thead className="sticky top-0 z-10 bg-muted"><tr><th className="w-16 px-3 py-3 text-center">순번</th><th className="px-3 py-3 text-right">기준치수</th><th className="px-3 py-3 text-right">공차 min</th><th className="px-3 py-3 text-right">공차 max</th></tr></thead><tbody>{selectedItems.length ? selectedItems.map((item) => <tr className="border-t border-border bg-background" key={item.seq}><td className="px-3 py-2.5 text-center tabular-nums">{item.sort_order}</td><td className="px-3 py-2.5 text-right tabular-nums">{numberText(item.nominal_dimension)}</td><td className="px-3 py-2.5 text-right tabular-nums">{numberText(item.tolerance_min)}</td><td className="px-3 py-2.5 text-right tabular-nums">{numberText(item.tolerance_max)}</td></tr>) : <tr><td className="px-4 py-12 text-center text-muted-foreground" colSpan={4}>등록된 검사항목이 없어요.</td></tr>}</tbody></table></div></div>
          </div>
        </div> : <div className="flex min-h-72 items-center justify-center p-6 text-center text-sm text-muted-foreground">왼쪽 목록에서 성적서를 선택해 주세요.</div>}
      </section>
    </div>
    {editorOpen ? <ReportEditor data={data} key={`${editingReport?.seq ?? "new"}-${editorOpen}`} onOpenChange={setEditorOpen} open={editorOpen} report={editingReport} /> : null}
    {selected ? <DeleteReportDialog key={`${selected.seq}-${deleteOpen}`} onOpenChange={setDeleteOpen} open={deleteOpen} report={selected} /> : null}
    {detailFullscreen && selectedItem?.image_url ? <FullscreenImage label={selectedItem.item_detail_name} markers={selectedMarkers} onClose={() => setDetailFullscreen(false)} url={selectedItem.image_url} /> : null}
  </div>;
}
