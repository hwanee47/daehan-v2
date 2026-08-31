import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

export function SearchConditions({ children, className, summary }: { children: React.ReactNode; className?: string; summary?: React.ReactNode }) {
  return (
    <details className={cn("group/search border-y border-border bg-background", className)}>
      <summary className="flex h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="inline-flex min-w-0 items-center gap-2"><SlidersHorizontal aria-hidden="true" className="size-[18px] shrink-0" /><span className="shrink-0">조회조건</span>{summary ? <span className="truncate font-normal text-muted-foreground">{summary}</span> : null}</span>
        <ChevronDown aria-hidden="true" className="size-[18px] shrink-0 transition-transform group-open/search:rotate-180" />
      </summary>
      <div className="border-t border-border">{children}</div>
    </details>
  );
}
