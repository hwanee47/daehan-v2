"use client";

import { Fragment, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import type { AppTabHref } from "@/lib/app-tabs";
import { cn } from "@/lib/utils";
import {
  defaultSplitRatio,
  maxSplitRatio,
  minSplitRatio,
  useUiStore,
} from "@/stores/ui-store";

import { WorkspacePanel } from "./workspace-panels";

const subscribeToClient = () => () => undefined;

export function WorkspaceShell({
  allowedTabHrefs,
  children,
}: {
  allowedTabHrefs: AppTabHref[];
  children: React.ReactNode;
}) {
  const isHydrated = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const activeTabHref = useUiStore((state) => state.activeTabHref);
  const isWorkspaceVisible = useUiStore((state) => state.isWorkspaceVisible);
  const isSplitView = useUiStore((state) => state.isSplitView);
  const splitRatio = useUiStore((state) => state.splitRatio);
  const setSplitRatio = useUiStore((state) => state.setSplitRatio);
  const openTabHrefs = useUiStore((state) => state.openTabHrefs);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const allowedTabs = useMemo(() => new Set(allowedTabHrefs), [allowedTabHrefs]);
  const visibleTabHref =
    isHydrated && isWorkspaceVisible && activeTabHref && allowedTabs.has(activeTabHref)
      ? activeTabHref
      : null;
  const visibleTabIndex = visibleTabHref ? openTabHrefs.indexOf(visibleTabHref) : -1;
  const secondaryTabHref =
    isSplitView && visibleTabIndex >= 0 && openTabHrefs.length >= 2
      ? (openTabHrefs[visibleTabIndex + 1] ?? openTabHrefs[visibleTabIndex - 1] ?? null)
      : null;

  useEffect(() => {
    for (const href of openTabHrefs) {
      if (!allowedTabs.has(href)) {
        useUiStore.getState().closeTab(href);
      }
    }
  }, [allowedTabHrefs, allowedTabs, openTabHrefs]);

  function updateSplitRatio(clientX: number) {
    const container = splitContainerRef.current;
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    if (bounds.width === 0) return;

    setSplitRatio(((clientX - bounds.left) / bounds.width) * 100);
  }

  function handleSeparatorPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSplitRatio(event.clientX);
  }

  function handleSeparatorPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updateSplitRatio(event.clientX);
  }

  function handleSeparatorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 2;
    let nextRatio: number | null = null;

    if (event.key === "ArrowLeft") nextRatio = splitRatio - step;
    if (event.key === "ArrowRight") nextRatio = splitRatio + step;
    if (event.key === "Home") nextRatio = defaultSplitRatio;

    if (nextRatio !== null) {
      event.preventDefault();
      setSplitRatio(nextRatio);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <div
        className="h-full overflow-y-auto overscroll-contain"
        hidden={visibleTabHref !== null}
      >
        {children}
      </div>
      <div
        className={cn(
          "h-full min-h-0",
          secondaryTabHref && "md:grid",
        )}
        hidden={visibleTabHref === null}
        ref={splitContainerRef}
        style={
          secondaryTabHref
            ? {
                gridTemplateColumns: `minmax(0, ${splitRatio}fr) 1px minmax(0, ${100 - splitRatio}fr)`,
              }
            : undefined
        }
      >
        {openTabHrefs.map((href) => {
          if (!allowedTabs.has(href)) return null;
          const isPrimary = visibleTabHref === href;
          const isSecondary = secondaryTabHref === href;

          return (
            <Fragment key={href}>
              <section
                aria-hidden={!isPrimary && !isSecondary}
                aria-labelledby={`workspace-tab-${href.replaceAll("/", "-")}`}
                className={cn(
                  "h-full min-w-0 overflow-y-auto overscroll-contain",
                  isPrimary && "md:order-1",
                  isSecondary && "hidden md:order-3 md:block",
                )}
                hidden={!isPrimary && !isSecondary}
                id={`workspace-panel-${href.replaceAll("/", "-")}`}
                role="tabpanel"
              >
                <WorkspacePanel href={href} isVisible={isPrimary || isSecondary} />
              </section>

              {isPrimary && secondaryTabHref ? (
                <div
                  aria-label="분할 화면 너비 조절"
                  aria-orientation="vertical"
                  aria-valuemax={maxSplitRatio}
                  aria-valuemin={minSplitRatio}
                  aria-valuenow={Math.round(splitRatio)}
                  className="relative z-10 hidden w-5 -translate-x-1/2 cursor-col-resize touch-none bg-transparent outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border hover:after:bg-primary focus-visible:after:w-0.5 focus-visible:after:bg-primary md:order-2 md:block"
                  onDoubleClick={() => setSplitRatio(defaultSplitRatio)}
                  onKeyDown={handleSeparatorKeyDown}
                  onPointerDown={handleSeparatorPointerDown}
                  onPointerMove={handleSeparatorPointerMove}
                  role="separator"
                  tabIndex={0}
                />
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
