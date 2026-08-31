import { type GridApi, themeQuartz } from "ag-grid-community";

export const appGridTheme = themeQuartz.withParams({
  accentColor: "var(--primary)",
  backgroundColor: "var(--background)",
  borderColor: "var(--border)",
  foregroundColor: "var(--foreground)",
  fontFamily: "var(--font-pretendard), sans-serif",
  fontSize: 14,
  headerBackgroundColor: "var(--muted)",
  headerFontWeight: 600,
  rowHoverColor: "transparent",
  spacing: 7,
  wrapperBorderRadius: 0,
});

export const appGridSingleRowSelection = {
  checkboxes: false,
  enableClickSelection: "enableSelection",
  mode: "singleRow",
} as const;

export function syncSelectedGridRow(api: GridApi, selectedId: number | string | null) {
  if (selectedId === null) {
    api.deselectAll();
    return;
  }

  api.getRowNode(String(selectedId))?.setSelected(true, true);
}
