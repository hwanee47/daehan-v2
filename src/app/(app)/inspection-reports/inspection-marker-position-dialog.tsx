"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Check, RotateCcw, Undo2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { InspectionMarkerImage } from "./inspection-marker-image";
import type { InspectionReportDraftItem } from "./types";

type MarkerSnapshot = Pick<InspectionReportDraftItem, "markerXRatio" | "markerYRatio">[];

export function InspectionMarkerPositionDialog({
  imageLabel,
  imageUrl,
  onApply,
  onOpenChange,
  open,
  rows,
}: {
  imageLabel: string;
  imageUrl: string;
  onApply: (positions: MarkerSnapshot) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  rows: InspectionReportDraftItem[];
}) {
  const [positions, setPositions] = useState<MarkerSnapshot>(() => rows.map((row) => ({ markerXRatio: row.markerXRatio, markerYRatio: row.markerYRatio })));
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, positions.findIndex((position) => position.markerXRatio === null)));
  const [history, setHistory] = useState<MarkerSnapshot[]>([]);
  const markers = useMemo(() => positions.flatMap((position, index) => position.markerXRatio === null || position.markerYRatio === null ? [] : [{ x: position.markerXRatio, y: position.markerYRatio, label: index + 1 }]), [positions]);
  const placedCount = markers.length;

  function commit(next: MarkerSnapshot) {
    setHistory((current) => [...current, positions]);
    setPositions(next);
  }

  function place(x: number, y: number) {
    const next = positions.map((position, index) => index === activeIndex ? { markerXRatio: x, markerYRatio: y } : position);
    commit(next);
    const nextUnplaced = next.findIndex((position, index) => index > activeIndex && position.markerXRatio === null);
    const firstUnplaced = next.findIndex((position) => position.markerXRatio === null);
    if (nextUnplaced >= 0) setActiveIndex(nextUnplaced);
    else if (firstUnplaced >= 0) setActiveIndex(firstUnplaced);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setPositions(previous);
    setHistory((current) => current.slice(0, -1));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[80] bg-foreground/40 backdrop-blur-[2px]" />
        <Dialog.Viewport className="fixed inset-0 z-[80] overflow-y-auto p-3 sm:p-6">
          <Dialog.Popup className="mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-[1500px] flex-col rounded-3xl border border-border bg-card p-4 shadow-xl outline-none sm:min-h-0 sm:h-[calc(100svh-3rem)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><Dialog.Title className="text-xl font-semibold">순번 위치 설정</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">오른쪽에서 검사항목을 선택하고 이미지의 검사 위치를 클릭해 주세요.</Dialog.Description></div>
              <Dialog.Close aria-label="닫기" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-accent"><X aria-hidden="true" /></Dialog.Close>
            </div>
            <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="relative min-h-[420px] overflow-hidden border border-border bg-muted/30 lg:min-h-0">
                <InspectionMarkerImage alt={`${imageLabel} 이미지`} editable markers={markers} onPlace={place} url={imageUrl} />
                <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground/80 px-4 py-2 text-xs font-semibold text-background">{activeIndex + 1}번 위치를 클릭해 주세요</p>
              </div>
              <aside className="flex min-h-0 flex-col rounded-2xl bg-muted/45 p-3" aria-label="검사항목 순번 목록">
                <div className="flex items-center justify-between px-1 py-2"><strong className="text-sm">검사항목</strong><span className="text-xs text-muted-foreground">{placedCount}/{rows.length} 설정</span></div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-2">{rows.map((row, index) => {
                  const placed = positions[index]?.markerXRatio !== null;
                  return <button aria-pressed={activeIndex === index} className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors", activeIndex === index ? "border-primary bg-primary/10" : "border-transparent bg-background hover:bg-accent")} key={row.seq ?? index} onClick={() => setActiveIndex(index)} type="button"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold", placed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")}>{placed ? <Check aria-hidden="true" size={16} /> : index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{index + 1}번 · 기준 {row.nominalDimension || "미입력"}</span><span className="mt-0.5 block text-xs text-muted-foreground">{placed ? "위치 설정됨 · 클릭해서 다시 배치" : "위치 미설정"}</span></span></button>;
                })}</div>
                <div className="grid grid-cols-2 gap-2 border-t border-border pt-3"><Button disabled={!history.length} onClick={undo} type="button" variant="secondary"><Undo2 aria-hidden="true" />실행 취소</Button><Button disabled={!placedCount} onClick={() => { commit(positions.map(() => ({ markerXRatio: null, markerYRatio: null }))); setActiveIndex(0); }} type="button" variant="secondary"><RotateCcw aria-hidden="true" />전체 초기화</Button></div>
              </aside>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">설정하지 않은 항목은 이미지에 번호가 표시되지 않아요.</p><div className="flex gap-2"><Dialog.Close className="inline-flex h-11 items-center rounded-xl bg-secondary px-5 font-semibold">취소</Dialog.Close><Button onClick={() => { onApply(positions); onOpenChange(false); }} type="button">설정 완료</Button></div></div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
