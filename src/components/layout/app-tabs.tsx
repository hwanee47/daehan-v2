"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Columns2, Maximize2, Minimize2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Container } from "@/components/layout/container";
import { getAppTab, isAppTabHref } from "@/lib/app-tabs";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const subscribeToClient = () => () => undefined;

export function AppTabs() {
  const pathname = usePathname();
  const isHydrated = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );
  const workspaceRoot = useSyncExternalStore(
    subscribeToClient,
    () => document.querySelector<HTMLElement>("[data-workspace-root]"),
    () => null,
  );
  const openTabHrefs = useUiStore((state) => state.openTabHrefs);
  const activeTabHref = useUiStore((state) => state.activeTabHref);
  const isWorkspaceVisible = useUiStore((state) => state.isWorkspaceVisible);
  const openTab = useUiStore((state) => state.openTab);
  const activateTab = useUiStore((state) => state.activateTab);
  const closeTab = useUiStore((state) => state.closeTab);
  const closeAllTabs = useUiStore((state) => state.closeAllTabs);
  const clearTabLimitMessage = useUiStore((state) => state.clearTabLimitMessage);
  const isSplitView = useUiStore((state) => state.isSplitView);
  const tabLimitMessage = useUiStore((state) => state.tabLimitMessage);
  const toggleSplitView = useUiStore((state) => state.toggleSplitView);
  const [closeAllOpen, setCloseAllOpen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canFullscreen = isHydrated && Boolean(workspaceRoot) && document.fullscreenEnabled;

  useEffect(() => {
    if (isAppTabHref(pathname)) {
      openTab(pathname);
    }
  }, [openTab, pathname]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setFullscreenError(null);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!tabLimitMessage) return;
    const timeoutId = window.setTimeout(clearTabLimitMessage, 4000);
    return () => window.clearTimeout(timeoutId);
  }, [clearTabLimitMessage, tabLimitMessage]);

  if (!isHydrated || openTabHrefs.length === 0) {
    return null;
  }

  function handleTabListKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLButtonElement;
    if (target.getAttribute("role") !== "tab") return;

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const currentIndex = tabs.indexOf(target);
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      tabs[nextIndex]?.focus();
      tabs[nextIndex]?.click();
    }

    if (event.key === "Delete") {
      const href = target.dataset.tabHref;
      if (href && isAppTabHref(href)) {
        event.preventDefault();
        closeTab(href);
      }
    }
  }

  async function toggleFullscreen() {
    if (!workspaceRoot || !document.fullscreenEnabled) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await workspaceRoot.requestFullscreen();
      }
    } catch {
      setFullscreenError("전체화면을 시작하지 못했어요. 브라우저 설정을 확인해 주세요.");
    }
  }

  async function handleCloseAll() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } finally {
      closeAllTabs();
      setCloseAllOpen(false);
    }
  }

  return (
    <div className="shrink-0 bg-muted/30">
      <Container
        className="relative flex items-end gap-2 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-border before:content-['']"
        size="full"
      >
        <div className="min-w-0 flex-1 overflow-x-auto">
          <nav
            aria-label="열린 업무 화면"
            className="flex min-w-max items-end gap-1 pt-2"
            onKeyDown={handleTabListKeyDown}
            role="tablist"
          >
            {openTabHrefs.map((href) => {
              const tab = getAppTab(href);

              if (!tab) {
                return null;
              }

              const isActive = isWorkspaceVisible && activeTabHref === href;

              return (
                <div
                  className={cn(
                    "flex h-11 items-center rounded-t-sm border transition-colors",
                    isActive
                      ? "relative z-10 border-border border-b-background bg-background text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  key={href}
                >
                  <button
                    aria-controls={`workspace-panel-${href.replaceAll("/", "-")}`}
                    aria-current={isActive ? "page" : undefined}
                    aria-selected={isActive}
                    className="flex h-full items-center pl-4 pr-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    data-tab-href={href}
                    id={`workspace-tab-${href.replaceAll("/", "-")}`}
                    onClick={() => activateTab(href)}
                    role="tab"
                    tabIndex={activeTabHref === href ? 0 : -1}
                    type="button"
                  >
                    {tab.label}
                  </button>
                  <button
                    aria-label={`${tab.label} 탭 닫기`}
                    className="mr-1 flex size-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => closeTab(href)}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        <div aria-label="작업영역 도구" className="flex shrink-0 items-center gap-1 pb-1" role="toolbar">
          <button
            aria-label={isFullscreen ? "전체화면 해제" : "전체화면"}
            aria-pressed={isFullscreen}
            className="flex size-11 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
            disabled={!canFullscreen}
            onClick={toggleFullscreen}
            title={isFullscreen ? "전체화면 해제" : "전체화면"}
            type="button"
          >
            {isFullscreen ? <Minimize2 aria-hidden="true" className="size-5" /> : <Maximize2 aria-hidden="true" className="size-5" />}
          </button>
          <button
            aria-label={isSplitView ? "2분할 해제" : "2분할 화면"}
            aria-pressed={isSplitView}
            className="hidden size-11 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 md:flex"
            disabled={openTabHrefs.length < 2}
            onClick={toggleSplitView}
            title={isSplitView ? "2분할 해제" : "2분할 화면"}
            type="button"
          >
            <Columns2 aria-hidden="true" className="size-5" />
          </button>
          <button
            aria-label="전체 탭 닫기"
            className="flex size-11 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setCloseAllOpen(true)}
            title="전체 닫기"
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
      </Container>

      {tabLimitMessage || fullscreenError ? (
        <Container className="pb-2 pt-1" size="full">
          <p className="text-sm text-muted-foreground" role="status">
            {tabLimitMessage ?? fullscreenError}
          </p>
        </Container>
      ) : null}

      <AlertDialog.Root onOpenChange={setCloseAllOpen} open={closeAllOpen}>
        <AlertDialog.Portal container={workspaceRoot}>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px]" />
          <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <AlertDialog.Popup className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl outline-none">
              <AlertDialog.Title className="text-xl font-semibold">열린 탭을 모두 닫을까요?</AlertDialog.Title>
              <AlertDialog.Description className="mt-3 break-keep text-muted-foreground">
                저장하지 않은 입력과 화면 상태가 모두 사라져요.
              </AlertDialog.Description>
              <div className="mt-6 flex justify-end gap-3">
                <AlertDialog.Close className="inline-flex h-12 items-center justify-center rounded-xl bg-secondary px-5 font-semibold">취소</AlertDialog.Close>
                <button className="inline-flex h-12 items-center justify-center rounded-xl bg-destructive px-5 font-semibold text-destructive-foreground" onClick={handleCloseAll} type="button">전체 닫기</button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
