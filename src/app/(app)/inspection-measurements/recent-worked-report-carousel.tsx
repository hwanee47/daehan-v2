"use client";

import { ChevronLeft, ChevronRight, Clock3, FileSearch2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { RecentWorkedReport } from "./actions";

type DragState = {
  pointerId: number;
  startX: number;
  scrollLeft: number;
  moved: boolean;
};

export function RecentWorkedReportCarousel({
  error,
  isPending,
  onOpenSearch,
  onSelect,
  reports,
}: {
  error: string | null;
  isPending: boolean;
  onOpenSearch: () => void;
  onSelect: (reportSeq: number) => void;
  reports: RecentWorkedReport[];
}) {
  const railRef = useRef<HTMLUListElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  function scrollRail(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollBy({ left: direction * Math.max(260, rail.clientWidth * 0.72), behavior: reduceMotion ? "auto" : "smooth" });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLUListElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const rail = railRef.current;
    if (!rail) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: rail.scrollLeft, moved: false };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLUListElement>) {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag || !rail || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) > 6) {
      drag.moved = true;
      suppressClickRef.current = true;
      setIsDragging(true);
      rail.setPointerCapture(event.pointerId);
    }
    if (drag.moved) {
      event.preventDefault();
      rail.scrollLeft = drag.scrollLeft - distance;
    }
  }

  function finishPointerDrag(event: React.PointerEvent<HTMLUListElement>) {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (rail?.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setIsDragging(false);
    if (drag.moved) window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  }

  function handleCardClick(event: React.MouseEvent<HTMLButtonElement>, reportSeq: number) {
    if (suppressClickRef.current) {
      event.preventDefault();
      return;
    }
    onSelect(reportSeq);
  }

  return (
    <div className="min-h-72 border-y border-border bg-background">
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="font-semibold">최근 작업 성적서</h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">카드를 선택하면 빈 측정결과로 바로 시작해요.</p>
        </div>
        <Button className="shrink-0" onClick={onOpenSearch} type="button">
          <FileSearch2 aria-hidden="true" />
          검사성적서 불러오기
        </Button>
      </div>

      {isPending ? (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">최근 작업 성적서를 불러오는 중이에요.</p>
      ) : reports.length ? (
        <div className="relative px-10 py-5 @min-[640px]/workspace:px-12 @min-[1024px]/workspace:px-14">
          <Button aria-label="이전 성적서 보기" className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background shadow-sm @min-[640px]/workspace:left-2" onClick={() => scrollRail(-1)} size="icon" type="button" variant="outline">
            <ChevronLeft aria-hidden="true" />
          </Button>
          <ul
            aria-label="최근 작업 검사성적서"
            className={cn(
              "flex snap-x snap-mandatory items-start gap-3 overflow-x-auto overscroll-x-contain pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              isDragging ? "cursor-grabbing select-none scroll-auto" : "cursor-grab scroll-smooth",
            )}
            onPointerCancel={finishPointerDrag}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointerDrag}
            ref={railRef}
          >
            {reports.map((report, index) => (
              <li
                className={cn(
                  "relative min-w-0 shrink-0 basis-[88%] snap-start @min-[640px]/workspace:basis-[48%] @min-[1024px]/workspace:basis-[31%] @min-[1280px]/workspace:basis-[24%]",
                )}
                key={report.seq}
                style={{ zIndex: reports.length - index }}
              >
                <button
                  aria-label={`${report.model_name || "기종 미입력"} ${report.item_detail_name || "품목상세명 미입력"} 검사성적서 불러오기`}
                  className={cn(
                    "group flex h-56 w-full flex-col overflow-hidden rounded-sm border bg-background text-left outline-none transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md focus-visible:-translate-y-1 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/20 motion-reduce:transition-none",
                    index === 0 ? "border-primary/80 shadow-sm" : "border-border shadow-xs",
                  )}
                  onClick={(event) => handleCardClick(event, report.seq)}
                  type="button"
                >
                  <div className="flex min-h-16 items-center border-b border-border px-5">
                    <span className="text-lg font-bold tracking-tight text-foreground">검사성적서</span>
                  </div>
                  <dl className="grid flex-1 grid-cols-[5.75rem_minmax(0,1fr)] text-sm">
                    <dt className="flex items-center border-b border-r border-border bg-muted/25 px-4 font-semibold">기종</dt>
                    <dd className="flex min-w-0 items-center border-b border-border px-4 font-medium text-primary"><span className="truncate">{report.model_name || ""}</span></dd>
                    <dt className="flex items-center border-b border-r border-border bg-muted/25 px-4 font-semibold">품명</dt>
                    <dd className="flex min-w-0 items-center border-b border-border px-4"><span className="truncate">{report.item_detail_name || ""}</span></dd>
                    <dt className="flex items-center border-r border-border bg-muted/25 px-4 font-semibold">품번/도번</dt>
                    <dd className="flex min-w-0 items-center px-4"><span className="truncate">{report.item_detail_code}</span></dd>
                  </dl>
                  <div className="flex min-h-12 items-center justify-between gap-3 border-t border-border bg-primary/[0.035] px-4 text-xs">
                    <span className="flex shrink-0 items-center gap-1.5 font-medium text-muted-foreground"><Clock3 aria-hidden="true" className="size-3.5" />최근 작업</span>
                    <time className="truncate tabular-nums text-primary" dateTime={report.lastWorkedAt}>
                      {new Date(report.lastWorkedAt).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                    </time>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <Button aria-label="다음 성적서 보기" className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background shadow-sm @min-[640px]/workspace:right-2" onClick={() => scrollRail(1)} size="icon" type="button" variant="outline">
            <ChevronRight aria-hidden="true" />
          </Button>
          <div aria-hidden="true" className="mt-1 flex justify-center gap-1.5">
            {reports.map((report, index) => <span className={cn("h-1.5 rounded-full", index === 0 ? "w-8 bg-primary" : "w-5 bg-border")} key={report.seq} />)}
          </div>
        </div>
      ) : (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">{error ?? "최근 작업한 성적서가 아직 없어요."}</p>
      )}
    </div>
  );
}
