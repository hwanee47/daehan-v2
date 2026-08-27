"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { WorkspaceMenuButton } from "@/components/layout/workspace-menu-button";
import { Button } from "@/components/ui/button";

const menuItems = [{ label: "성적서 관리", href: "/inspection-reports" }, { label: "결과 입력", href: "/inspection-measurements" }, { label: "측정 이력", href: "/inspection-measurement-history" }] as const;

export function InspectionReportMenu() {
  const [open, setOpen] = useState(false); const id = useId(); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const pointer = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); }; const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("pointerdown", pointer); document.addEventListener("keydown", key); return () => { document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", key); }; }, [open]);
  return <div className="relative" ref={ref}><Button aria-controls={open ? id : undefined} aria-expanded={open} aria-haspopup="menu" className="h-11 gap-1 px-3 sm:px-5" onClick={() => setOpen((value) => !value)} variant="ghost">검사성적서<ChevronDown aria-hidden="true" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} /></Button>{open ? <div aria-label="검사성적서 하위 메뉴" className="absolute left-0 top-full z-50 mt-2 w-40 rounded-2xl border border-border bg-popover p-2 shadow-lg" id={id} role="menu">{menuItems.map((item) => <WorkspaceMenuButton className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={item.href} key={item.href} onOpen={() => setOpen(false)} role="menuitem">{item.label}</WorkspaceMenuButton>)}</div> : null}</div>;
}
