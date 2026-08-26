import { ChevronRight } from "lucide-react";

export function WorkspaceBreadcrumb({ current, parent }: { current: string; parent: string }) {
  return (
    <nav aria-label="현재 위치" className="mb-5 flex items-center gap-2.5 text-sm">
      <span aria-hidden="true" className="h-4 w-1 shrink-0 rounded-full bg-primary" />
      <ol className="flex flex-wrap items-center gap-1.5">
        <li className="text-muted-foreground">{parent}</li>
        <li aria-hidden="true" className="text-muted-foreground/70">
          <ChevronRight className="size-4" />
        </li>
        <li>
          <span aria-current="page" className="font-semibold text-foreground">{current}</span>
        </li>
      </ol>
    </nav>
  );
}
