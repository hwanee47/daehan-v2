"use client";

import { AlertCircle, ArrowRight, ClipboardCheck, FileClock, FilePlus2, History, ImageOff, PackageSearch, Printer, Ruler, Save, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AppTabHref } from "@/lib/app-tabs";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

import type { HomeDashboardData } from "./home-data";

function dateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

export function HomeDashboard({ data }: { data: HomeDashboardData }) {
  const openTab = useUiStore((state) => state.openTab);
  const cards = [
    { label: "전체 성적서", value: data.counts.reports, icon: ClipboardCheck, href: "/inspection-reports" as const },
    { label: "측정 이력 없음", value: data.counts.withoutMeasurementHistory, icon: ScanLine, href: "/inspection-measurements" as const },
    { label: "오늘 저장 이력", value: data.counts.savedToday, icon: Save, href: "/inspection-measurement-history" as const },
    { label: "오늘 인쇄 이력", value: data.counts.printedToday, icon: Printer, href: "/inspection-measurement-history" as const },
  ];
  const quickLinks: Array<{ label: string; description: string; href: AppTabHref; icon: typeof FilePlus2 }> = [
    { label: "성적서 관리", description: "성적서와 검사항목 관리", href: "/inspection-reports", icon: FilePlus2 },
    { label: "결과 입력", description: "측정값 저장과 인쇄", href: "/inspection-measurements", icon: ScanLine },
    { label: "측정 이력", description: "과거 저장·인쇄 이력", href: "/inspection-measurement-history", icon: History },
    ...(data.canManageMasters ? [
      { label: "품목관리", description: "품목과 도면 이미지 관리", href: "/master/items" as const, icon: PackageSearch },
      { label: "오차범위관리", description: "품목별 기본 공차 관리", href: "/master/tolerance-ranges" as const, icon: Ruler },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 @min-[768px]/workspace:flex-row @min-[768px]/workspace:items-end @min-[768px]/workspace:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{data.todayLabel}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight @min-[768px]/workspace:text-3xl">검사 업무 현황</h1>
          <p className="mt-2 text-sm text-muted-foreground">등록된 성적서와 측정 이력을 기준으로 현재 상태를 보여줘요.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openTab("/inspection-reports")} variant="secondary"><FilePlus2 aria-hidden="true" />성적서 관리</Button>
          <Button onClick={() => openTab("/inspection-measurements")}><ScanLine aria-hidden="true" />결과 입력</Button>
        </div>
      </section>

      {data.hasError ? <div className="flex items-center gap-2 border-y border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert"><AlertCircle aria-hidden="true" className="size-5" />일부 현황을 불러오지 못했어요. 각 관리 화면에서 최신 정보를 확인해 주세요.</div> : null}

      <section aria-label="검사 현황 요약" className="grid grid-cols-2 gap-3 @min-[768px]/workspace:grid-cols-4">
        {cards.map(({ href, icon: Icon, label, value }) => <button className="group min-h-32 border border-border bg-card p-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 @min-[768px]/workspace:p-5" key={label} onClick={() => openTab(href)} type="button"><span className="flex items-center justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-5" /></span><ArrowRight aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></span><strong className="mt-5 block text-3xl font-semibold tabular-nums">{value.toLocaleString("ko-KR")}</strong><span className="mt-1 block text-sm text-muted-foreground">{label}</span></button>)}
      </section>

      <div className={cn("grid gap-6", data.canManageMasters && "@min-[1024px]/workspace:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]")}>
        <section aria-labelledby="without-history-title" className="min-w-0 border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 @min-[640px]/workspace:px-5"><div><h2 className="font-semibold" id="without-history-title">측정 이력 없음</h2><p className="mt-1 text-xs text-muted-foreground">저장 또는 인쇄 이력이 한 번도 없는 성적서예요.</p></div><Button onClick={() => openTab("/inspection-measurements")} size="sm" variant="ghost">결과 입력<ArrowRight aria-hidden="true" /></Button></div>
          {data.pendingReports.length ? <ul className="divide-y divide-border">{data.pendingReports.map((report) => <li key={report.seq}><button className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring @min-[640px]/workspace:px-5" onClick={() => openTab("/inspection-measurements")} type="button"><span className="min-w-0"><strong className="block truncate text-sm font-semibold">{report.modelName} · {report.itemDetailCode}</strong><span className="mt-1 block truncate text-xs text-muted-foreground">{report.customerName || "고객명 없음"}</span></span><span className="text-xs font-medium text-primary">#{report.seq}</span></button></li>)}</ul> : <p className="px-5 py-14 text-center text-sm text-muted-foreground">측정 이력이 없는 성적서가 없어요.</p>}
        </section>

        {data.canManageMasters ? <section aria-labelledby="data-check-title" className="border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold" id="data-check-title">기준정보 점검</h2><p className="mt-1 text-xs text-muted-foreground">등록 정보의 누락 건수예요.</p></div><div className="divide-y divide-border">{[
          { label: "이미지 없는 품목상세", value: data.checks.itemDetailsWithoutImage, href: "/master/items" as const, icon: ImageOff },
          { label: "오차범위 없는 품목", value: data.checks.itemsWithoutTolerance, href: "/master/tolerance-ranges" as const, icon: Ruler },
          { label: "검사항목 없는 성적서", value: data.checks.reportsWithoutItems, href: "/inspection-reports" as const, icon: FileClock },
        ].map(({ href, icon: Icon, label, value }) => <button className="flex min-h-16 w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" key={label} onClick={() => openTab(href)} type="button"><Icon aria-hidden="true" className="size-5 text-muted-foreground" /><span className="min-w-0 flex-1 text-sm">{label}</span><strong className={cn("tabular-nums", value > 0 ? "text-primary" : "text-muted-foreground")}>{value.toLocaleString("ko-KR")}</strong></button>)}</div></section> : null}
      </div>

      <RecentHistory data={data} openTab={openTab} />

      <section aria-labelledby="quick-links-title"><h2 className="mb-3 font-semibold" id="quick-links-title">바로가기</h2><div className="grid gap-3 @min-[640px]/workspace:grid-cols-2 @min-[1024px]/workspace:grid-cols-3 @min-[1280px]/workspace:grid-cols-5">{quickLinks.map(({ description, href, icon: Icon, label }) => <button className="flex min-h-20 items-center gap-3 border border-border bg-card px-4 py-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25" key={href} onClick={() => openTab(href)} type="button"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary"><Icon aria-hidden="true" className="size-5" /></span><span className="min-w-0"><strong className="block text-sm font-semibold">{label}</strong><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span></button>)}</div></section>
    </div>
  );
}

function RecentHistory({ data, openTab }: { data: HomeDashboardData; openTab: (href: AppTabHref) => void }) {
  return <section aria-labelledby="recent-history-title" className="border border-border bg-card"><div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 @min-[640px]/workspace:px-5"><div><h2 className="font-semibold" id="recent-history-title">최근 측정 이력</h2><p className="mt-1 text-xs text-muted-foreground">최근 저장 또는 인쇄된 순서로 표시해요.</p></div><Button onClick={() => openTab("/inspection-measurement-history")} size="sm" variant="ghost">전체 이력<ArrowRight aria-hidden="true" /></Button></div>{data.recentRuns.length ? <div className="overflow-x-auto"><table className="w-full min-w-[780px] border-collapse text-sm"><thead className="bg-muted/70 text-left text-muted-foreground"><tr><th className="px-5 py-3 font-medium">일시</th><th className="px-4 py-3 font-medium">유형</th><th className="px-4 py-3 font-medium">기종</th><th className="px-4 py-3 font-medium">품명</th><th className="px-4 py-3 font-medium">품번/도번</th><th className="px-4 py-3 font-medium">고객명</th><th className="px-5 py-3 text-right font-medium">이력</th></tr></thead><tbody>{data.recentRuns.map((run) => <tr className="border-t border-border" key={run.seq}><td className="whitespace-nowrap px-5 py-3 tabular-nums">{dateTime(run.createdAt)}</td><td className="px-4 py-3"><span className="inline-flex rounded-full bg-secondary px-2 py-1 text-xs font-medium">{run.eventType === "print" ? "인쇄" : "저장"}</span></td><td className="px-4 py-3">{run.modelName}</td><td className="px-4 py-3">{run.itemName || ""}</td><td className="px-4 py-3">{run.itemDetailCode}</td><td className="px-4 py-3">{run.customerName || ""}</td><td className="px-5 py-2 text-right"><Button aria-label={`${run.modelName} ${run.itemDetailCode} 측정 이력 보기`} onClick={() => openTab("/inspection-measurement-history")} size="sm" variant="ghost">보기</Button></td></tr>)}</tbody></table></div> : <p className="px-5 py-14 text-center text-sm text-muted-foreground">저장 또는 인쇄된 측정 이력이 없어요.</p>}</section>;
}
