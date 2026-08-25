"use client";

import type { AppTabHref } from "@/lib/app-tabs";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

export function WorkspaceMenuButton({
  children,
  className,
  href,
  onOpen,
  role,
}: {
  children: React.ReactNode;
  className?: string;
  href: AppTabHref;
  onOpen?: () => void;
  role?: React.AriaRole;
}) {
  const openTab = useUiStore((state) => state.openTab);

  return (
    <button
      className={cn(className)}
      onClick={() => {
        openTab(href);
        onOpen?.();
      }}
      role={role}
      type="button"
    >
      {children}
    </button>
  );
}
