import { create } from "zustand";
import { persist } from "zustand/middleware";

import { isAppTabHref, type AppTabHref } from "@/lib/app-tabs";

type UiState = {
  isSidebarOpen: boolean;
  activeTabHref: AppTabHref | null;
  isWorkspaceVisible: boolean;
  isSplitView: boolean;
  splitRatio: number;
  openTabHrefs: AppTabHref[];
  tabLimitMessage: string | null;
  measurementTargetSeq: number | null;
  measurementTargetRequestId: number;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  openTab: (href: AppTabHref) => void;
  openMeasurementReport: (reportSeq: number) => void;
  activateTab: (href: AppTabHref) => void;
  closeTab: (href: AppTabHref) => void;
  closeAllTabs: () => void;
  clearTabLimitMessage: () => void;
  hideWorkspace: () => void;
  toggleSplitView: () => void;
  setSplitRatio: (ratio: number) => void;
};

export const maxOpenTabs = 5;
export const defaultSplitRatio = 50;
export const minSplitRatio = 25;
export const maxSplitRatio = 75;

function clampSplitRatio(ratio: number) {
  return Math.min(maxSplitRatio, Math.max(minSplitRatio, ratio));
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarOpen: false,
      activeTabHref: null,
      isWorkspaceVisible: false,
      isSplitView: false,
      splitRatio: defaultSplitRatio,
      openTabHrefs: [],
      tabLimitMessage: null,
      measurementTargetSeq: null,
      measurementTargetRequestId: 0,
      openSidebar: () => set({ isSidebarOpen: true }),
      closeSidebar: () => set({ isSidebarOpen: false }),
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      openTab: (href) =>
        set((state) => {
          if (state.openTabHrefs.includes(href)) {
            return {
              activeTabHref: href,
              isWorkspaceVisible: true,
              tabLimitMessage: null,
            };
          }

          if (state.openTabHrefs.length >= maxOpenTabs) {
            return {
              tabLimitMessage: `탭은 최대 ${maxOpenTabs}개까지 열 수 있어요.`,
            };
          }

          return {
            activeTabHref: href,
            isWorkspaceVisible: true,
            openTabHrefs: [...state.openTabHrefs, href],
            tabLimitMessage: null,
          };
        }),
      openMeasurementReport: (reportSeq) =>
        set((state) => {
          const href = "/inspection-measurements" as const;
          const isOpen = state.openTabHrefs.includes(href);

          if (!isOpen && state.openTabHrefs.length >= maxOpenTabs) {
            return {
              tabLimitMessage: `탭은 최대 ${maxOpenTabs}개까지 열 수 있어요.`,
            };
          }

          return {
            activeTabHref: href,
            isWorkspaceVisible: true,
            openTabHrefs: isOpen ? state.openTabHrefs : [...state.openTabHrefs, href],
            tabLimitMessage: null,
            measurementTargetSeq: reportSeq,
            measurementTargetRequestId: state.measurementTargetRequestId + 1,
          };
        }),
      activateTab: (href) =>
        set({ activeTabHref: href, isWorkspaceVisible: true }),
      closeTab: (href) =>
        set((state) => {
          const closingIndex = state.openTabHrefs.indexOf(href);
          const openTabHrefs = state.openTabHrefs.filter((tabHref) => tabHref !== href);
          const activeTabHref =
            state.activeTabHref === href
              ? (openTabHrefs[Math.min(closingIndex, openTabHrefs.length - 1)] ?? null)
              : state.activeTabHref;

          return {
            activeTabHref,
            isSplitView: openTabHrefs.length >= 2 ? state.isSplitView : false,
            isWorkspaceVisible: activeTabHref !== null,
            openTabHrefs,
          };
        }),
      closeAllTabs: () =>
        set({
          activeTabHref: null,
          isSplitView: false,
          isWorkspaceVisible: false,
          openTabHrefs: [],
          tabLimitMessage: null,
        }),
      clearTabLimitMessage: () => set({ tabLimitMessage: null }),
      hideWorkspace: () => set({ isWorkspaceVisible: false }),
      toggleSplitView: () =>
        set((state) => ({
          isSplitView: state.openTabHrefs.length >= 2 ? !state.isSplitView : false,
        })),
      setSplitRatio: (ratio) => set({ splitRatio: clampSplitRatio(ratio) }),
    }),
    {
      name: "daehan-ui",
      partialize: (state) => ({
        activeTabHref: state.activeTabHref,
        isWorkspaceVisible: state.isWorkspaceVisible,
        isSplitView: state.isSplitView,
        splitRatio: state.splitRatio,
        openTabHrefs: state.openTabHrefs,
      }),
      migrate: (persistedState) => {
        const previous = persistedState as Partial<UiState>;
        const openTabHrefs = Array.isArray(previous.openTabHrefs)
          ? previous.openTabHrefs.filter(
              (href): href is AppTabHref => typeof href === "string" && isAppTabHref(href),
            ).slice(0, maxOpenTabs)
          : [];

        return {
          ...previous,
          activeTabHref: openTabHrefs.at(-1) ?? null,
          isWorkspaceVisible: false,
          isSplitView: false,
          splitRatio:
            typeof previous.splitRatio === "number"
              ? clampSplitRatio(previous.splitRatio)
              : defaultSplitRatio,
          openTabHrefs,
          tabLimitMessage: null,
        } as UiState;
      },
      version: 4,
    },
  ),
);
