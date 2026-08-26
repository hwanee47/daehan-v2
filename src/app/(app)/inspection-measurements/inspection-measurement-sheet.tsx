"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Expand, Printer, Save, X } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { saveInspectionMeasurements } from "../inspection-reports/actions";
import { InspectionMarkerImage, type InspectionMarker } from "../inspection-reports/inspection-marker-image";
import type { InspectionReportActionState, InspectionReportData, InspectionReportDraftItem } from "../inspection-reports/types";

const initialState: InspectionReportActionState = { status: "idle" };

function valueText(value: number | null | undefined) { return value === null || value === undefined ? "" : String(value); }

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
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}><Dialog.Portal><Dialog.Backdrop className="fixed inset-0 z-[70] bg-foreground/90 backdrop-blur-sm" /><Dialog.Viewport className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"><Dialog.Popup className="relative size-full outline-none"><Dialog.Title className="sr-only">{label} 이미지 전체 화면 보기</Dialog.Title><Dialog.Description className="sr-only">검사항목 순번이 표시된 이미지를 화면에 맞춰 보여줘요.</Dialog.Description><InspectionMarkerImage alt={`${label} 도면 또는 제품 이미지`} markers={markers} url={url} /><Dialog.Close aria-label="전체 화면 닫기" className="absolute right-1 top-1 z-20 inline-flex size-11 items-center justify-center rounded-full bg-background text-foreground shadow-lg sm:right-3 sm:top-3"><X aria-hidden="true" /></Dialog.Close></Dialog.Popup></Dialog.Viewport></Dialog.Portal></Dialog.Root>;
}

export function InspectionMeasurementSheet({ data }: { data: InspectionReportData }) {
  const [selectedSeq, setSelectedSeq] = useState<number | null>(data.reports[0]?.seq ?? null);
  const report = data.reports.find((item) => item.seq === selectedSeq) ?? null;
  const reportItems = useMemo(() => data.items.filter((item) => item.inspection_report_seq === selectedSeq), [data.items, selectedSeq]);
  const initialRows = useMemo(() => reportItems.map((item): InspectionReportDraftItem => {
    const measurement = data.measurements.find((row) => row.inspection_report_item_seq === item.seq);
    return { seq: item.seq, nominalDimension: valueText(item.nominal_dimension), toleranceMin: valueText(item.tolerance_min), toleranceMax: valueText(item.tolerance_max), results: Array.from({ length: 10 }, (_, index) => valueText(measurement?.[`result_${index + 1}` as keyof typeof measurement] as number | null)), note: measurement?.note ?? "", markerXRatio: item.marker_x_ratio, markerYRatio: item.marker_y_ratio };
  }), [data.measurements, reportItems]);
  const [rowsByReport, setRowsByReport] = useState<Record<number, InspectionReportDraftItem[]>>({});
  const rows = report ? rowsByReport[report.seq] ?? initialRows : [];
  const [fullscreen, setFullscreen] = useState(false);
  const [printDateTime, setPrintDateTime] = useState("");
  const [state, action, pending] = useActionState(saveInspectionMeasurements, initialState);
  const item = data.itemOptions.find((option) => option.seq === report?.item_detail_seq);
  const productCodes = data.codes.filter((code) => code.group_code === "PRODUCT_TYPE");
  const productName = data.codes.find((code) => code.seq === report?.product_type_code_seq)?.code_name ?? "";
  const markers = reportItems.flatMap((reportItem) => reportItem.marker_x_ratio === null || reportItem.marker_y_ratio === null ? [] : [{ x: reportItem.marker_x_ratio, y: reportItem.marker_y_ratio, label: reportItem.sort_order }]);
  const judgmentNameBySeq = useMemo(() => new Map(data.codes.filter((code) => code.group_code === "FINAL_JUDGMENT_STATUS").map((code) => [code.seq, code.code_name])), [data.codes]);

  function setRows(next: InspectionReportDraftItem[]) { if (report) setRowsByReport((current) => ({ ...current, [report.seq]: next })); }
  function updateResult(rowIndex: number, resultIndex: number, value: string) { const next = rows.map((row, index) => index === rowIndex ? { ...row, results: row.results.map((result, sampleIndex) => sampleIndex === resultIndex ? value : result) } : row); setRows(next); }
  function printReport() {
    const originalTitle = document.title;
    const restoreTitle = () => { document.title = originalTitle; };
    setPrintDateTime(new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "medium", hour12: false }).format(new Date()));
    document.title = "";
    window.addEventListener("afterprint", restoreTitle, { once: true });
    window.setTimeout(() => window.print(), 0);
  }

  if (data.hasError) return <div className="border-y border-border p-10 text-center" role="alert"><h2 className="font-semibold">검사성적서를 불러오지 못했어요</h2><p className="mt-2 text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p></div>;

  return <div className="grid min-h-[680px] min-w-0 gap-5 @min-[1024px]/workspace:grid-cols-[280px_minmax(0,1fr)] @min-[1280px]/workspace:grid-cols-[300px_minmax(0,1fr)]">
    <aside aria-labelledby="measurement-report-list-title" className="min-w-0 self-start border-y border-border @min-[1024px]/workspace:sticky @min-[1024px]/workspace:top-0">
      <div className="flex items-center justify-between bg-muted/70 px-4 py-3"><h2 className="font-semibold" id="measurement-report-list-title">검사성적서</h2><span className="text-xs text-muted-foreground">총 {data.reports.length}건</span></div>
      <div className="max-h-72 overflow-y-auto @min-[1024px]/workspace:max-h-[calc(100svh-190px)]">
        {data.reports.length ? <div className="divide-y divide-border">{data.reports.map((value) => {
          const selected = value.seq === selectedSeq;
          const itemOption = data.itemOptions.find((option) => option.seq === value.item_detail_seq);
          return <button aria-pressed={selected} className={cn("block min-h-24 w-full px-4 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", selected && "bg-primary/10 hover:bg-primary/10")} key={value.seq} onClick={() => setSelectedSeq(value.seq)} type="button"><span className="flex items-center justify-between gap-3"><strong className="truncate text-sm">#{value.seq} · {value.item_detail_code}</strong><span className={cn("shrink-0 text-xs font-semibold", selected ? "text-primary" : "text-muted-foreground")}>{value.final_judgment_code_seq ? judgmentNameBySeq.get(value.final_judgment_code_seq) ?? "판정" : "미판정"}</span></span><span className="mt-2 block truncate text-sm text-muted-foreground">{itemOption?.item_name || value.model_name}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{value.customer_name || "고객 미입력"} · 시료 {value.sample_count ?? "-"}</span></button>;
        })}</div> : <p className="px-4 py-12 text-center text-sm text-muted-foreground">등록된 검사성적서가 없어요.</p>}
      </div>
    </aside>

    <section aria-label="측정결과 입력" className="min-w-0">
    {!report ? <div className="flex min-h-72 items-center justify-center border-y border-border p-10 text-center text-muted-foreground">왼쪽 목록에서 측정할 검사성적서를 선택해 주세요.</div> : <form action={action} className="inspection-measurement-form flex min-w-0 flex-col gap-3 @min-[1024px]/workspace:h-[calc(100svh-190px)]">
      <input name="reportSeq" type="hidden" value={report.seq} /><input name="items" type="hidden" value={JSON.stringify(rows)} />
      <div className="min-h-0 min-w-0 flex-1 overflow-auto border border-border bg-muted/25 p-2 @min-[768px]/workspace:p-4">
        <article className="inspection-print-sheet w-full min-w-[980px] bg-white text-[13px] leading-tight text-black shadow-sm" aria-label="검사성적서 측정 양식">
          <div className="grid h-20 grid-cols-[1fr_300px] border border-black">
            <h2 className="flex items-center justify-center text-3xl font-semibold tracking-[0.35em]">검 사 성 적 서</h2>
            <div className="grid grid-cols-3 border-l border-black"><div className="grid grid-rows-[24px_1fr] border-r border-black text-center"><span className="border-b border-black py-1">작 성</span><span /></div><div className="grid grid-rows-[24px_1fr] border-r border-black text-center"><span className="border-b border-black py-1">검 토</span><span /></div><div className="grid grid-rows-[24px_1fr] text-center"><span className="border-b border-black py-1">승 인</span><span /></div></div>
          </div>
          <div className="grid grid-cols-4 border-x border-b border-black">{[["기종", report.model_name], ["품명", item?.item_name ?? ""], ["품번/도번", report.item_detail_code], ["고객", report.customer_name ?? ""]].map(([label, value]) => <p className="border-r border-black p-2 last:border-r-0" key={label}><b>{label} :</b> <span className="text-xs">{value}</span></p>)}</div>
          <div className="grid grid-cols-4 border-x border-b border-black">{[["업체명", report.supplier_name ?? ""], ["납품수량", report.delivery_quantity?.toLocaleString() ?? ""], ["시료수", report.sample_count === null ? "" : String(report.sample_count)], ["납품일자", ""]].map(([label, value]) => <p className="border-r border-black p-2 last:border-r-0" key={label}><b>{label} :</b> <span className="text-xs">{value}</span></p>)}</div>
          <div className="flex min-h-9 items-center gap-5 border-x border-b border-black px-2"><b>제품구분 :</b>{productCodes.map((code) => <label className="flex items-center gap-1 text-xs" key={code.seq}><input checked={code.seq === report.product_type_code_seq} disabled readOnly type="radio" />{code.code_name}</label>)}{productCodes.length === 0 ? <span className="text-xs">{productName}</span> : null}</div>
          <div className="relative h-[300px] overflow-hidden border-x border-b border-black"><p className="absolute left-2 top-2 z-20 bg-white/85 pr-2 font-semibold">약도</p>{item?.image_url ? <><InspectionMarkerImage alt={`${item.item_detail_name} 도면 또는 제품 이미지`} markers={markers} url={item.image_url} verticalAlign="top" /><button aria-label="순번이 표시된 이미지 전체 화면 보기" className="inspection-print-hide absolute right-3 top-1 z-20 inline-flex size-10 items-center justify-center border border-black bg-white" onClick={() => setFullscreen(true)} type="button"><Expand aria-hidden="true" size={18} /></button></> : null}</div>
          <div className="grid grid-cols-[100px_72px_repeat(10,minmax(0,1fr))_80px] border-x border-b border-black text-left"><b className="border-r border-black p-2 text-center">중요항목</b><span className="col-span-4 border-r border-black p-2">재질 : <span className="text-xs">{item?.material ?? ""}</span></span><span className="col-span-5 border-r border-black p-2">경도 : <span className="text-xs">{report.hardness ?? ""}</span></span><span className="col-span-3 p-2">열처리 : <span className="text-xs">{report.heat_treatment ?? ""}</span></span></div>
          <table className="w-full table-fixed border-collapse border-x border-b border-black text-center"><colgroup><col className="w-10"/><col className="w-[60px]"/><col className="w-[72px]"/>{Array.from({length:10},(_,i)=><col key={i}/>)}<col className="w-20"/></colgroup><thead><tr><th className="border-b border-r border-black p-1" rowSpan={2}>순번</th><th className="border-b border-r border-black p-1" rowSpan={2}>기준<br/>치수</th><th className="border-b border-r border-black p-1" rowSpan={2}>공차</th><th className="border-b border-r border-black p-1" colSpan={10}>측 정 결 과</th><th className="border-b border-black p-1" rowSpan={2}>비고</th></tr><tr>{Array.from({ length: 10 }, (_, index) => <th className="border-b border-r border-black p-1 font-medium" key={index}>X<sub>{index + 1}</sub></th>)}</tr></thead><tbody>{Array.from({ length: Math.max(10, rows.length) }, (_, rowIndex) => { const row = rows[rowIndex]; if (!row) return <tr key={`blank-${rowIndex}`}><td className="h-9 border-b border-r border-black">{rowIndex + 1}</td><td className="border-b border-r border-black"/><td className="border-b border-r border-black"/>{Array.from({ length: 10 }, (_, resultIndex) => <td className="border-b border-r border-black" key={resultIndex}/>)}<td className="border-b border-black"/></tr>; return <tr key={row.seq}><td className="h-9 border-b border-r border-black">{rowIndex + 1}</td><td className="border-b border-r border-black tabular-nums">{row.nominalDimension}</td><td className="whitespace-pre-line border-b border-r border-black px-1 leading-tight tabular-nums">{toleranceText(row.toleranceMin, row.toleranceMax)}</td>{row.results.map((result, resultIndex) => { const enabled = report.sample_count === null || resultIndex < report.sample_count; return <td className={cn("border-b border-r border-black", !enabled && "bg-neutral-100")} key={resultIndex}><input aria-label={`${rowIndex + 1}번 항목 X${resultIndex + 1}`} className="h-9 w-full bg-transparent px-1 text-center outline-none focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:text-transparent" disabled={!enabled} inputMode="decimal" value={enabled ? result : ""} onChange={(event) => updateResult(rowIndex, resultIndex, event.target.value)} /></td>;})}<td className="border-b border-black"><input aria-label={`${rowIndex + 1}번 항목 비고`} className="h-9 w-full bg-transparent px-1 outline-none focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-600" maxLength={500} value={row.note} onChange={(event) => setRows(rows.map((value, index) => index === rowIndex ? { ...value, note: event.target.value } : value))} /></td></tr>; })}</tbody></table>
          <div className="grid min-h-24 grid-cols-[100px_72px_repeat(10,minmax(0,1fr))_80px] border-x border-b border-black">
            <div className="col-span-5 border-r border-black p-2 font-semibold">* 특기사항</div>
            <div className="flex items-center justify-center border-r border-black text-center font-semibold leading-snug">최종<br/>판정</div>
            <div className="col-span-7 grid grid-rows-[2fr_1fr]"><div className="flex items-center justify-center gap-10 border-b border-black text-sm font-semibold"><span>□ 합 격</span><span>□ 불 합 격</span></div><div className="grid grid-cols-2"><span className="flex items-center border-r border-black p-2">검사자:</span><span className="flex items-center p-2">검사일자:</span></div></div>
          </div>
          <time className="inspection-print-datetime" dateTime={printDateTime}>{printDateTime}</time>
        </article>
      </div>
      <div className="sticky bottom-0 z-30 flex min-h-16 flex-wrap items-center justify-end gap-3 border-t border-border bg-background/95 px-3 py-2 backdrop-blur @min-[640px]/workspace:px-4">
        {state.message ? <p className={cn("mr-auto text-sm", state.status === "error" ? "text-destructive" : "text-primary")} role="status">{state.message}</p> : <span className="mr-auto text-sm text-muted-foreground">입력한 측정결과를 저장해요.</span>}
        <Button onClick={printReport} type="button" variant="secondary"><Printer aria-hidden="true" />인쇄</Button>
        <Button disabled={pending} type="submit"><Save aria-hidden="true" />{pending ? "저장 중..." : "측정결과 저장"}</Button>
      </div>
    </form>}
    </section>
    {fullscreen && item?.image_url ? <MarkerFullscreenDialog label={item.item_detail_name} markers={markers} onClose={() => setFullscreen(false)} url={item.image_url} /> : null}
  </div>;
}
