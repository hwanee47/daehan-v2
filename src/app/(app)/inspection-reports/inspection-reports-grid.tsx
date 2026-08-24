"use client";

import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, themeQuartz } from "ag-grid-community";
import { AgGridProvider, AgGridReact } from "ag-grid-react";

type InspectionReport = {
  reportNumber: string;
  productName: string;
  lotNumber: string;
  inspectionDate: string;
  result: string;
};

const modules = [AllCommunityModule];

const daehanGridTheme = themeQuartz.withParams({
  accentColor: "var(--primary)",
  backgroundColor: "var(--background)",
  borderColor: "var(--border)",
  foregroundColor: "var(--foreground)",
  fontFamily: "var(--font-pretendard), sans-serif",
  fontSize: 15,
  headerBackgroundColor: "var(--muted)",
  headerFontWeight: 600,
  rowHoverColor: "var(--accent)",
  spacing: 8,
  wrapperBorderRadius: 0,
});

const rowData: InspectionReport[] = [
  {
    reportNumber: "DR-2026-0081",
    productName: "산업용 밸브 A형",
    lotNumber: "LOT-260821-A",
    inspectionDate: "2026-08-21",
    result: "적합",
  },
  {
    reportNumber: "DR-2026-0080",
    productName: "고압 연결구 B형",
    lotNumber: "LOT-260820-C",
    inspectionDate: "2026-08-20",
    result: "적합",
  },
  {
    reportNumber: "DR-2026-0079",
    productName: "정밀 가공축 C형",
    lotNumber: "LOT-260819-B",
    inspectionDate: "2026-08-19",
    result: "검토 중",
  },
];

const columnDefs: ColDef<InspectionReport>[] = [
  { field: "reportNumber", headerName: "성적서 번호", minWidth: 160 },
  { field: "productName", headerName: "품목명", flex: 1, minWidth: 190 },
  { field: "lotNumber", headerName: "LOT 번호", minWidth: 170 },
  { field: "inspectionDate", headerName: "검사일", minWidth: 140 },
  { field: "result", headerName: "결과", minWidth: 110 },
];

const defaultColDef: ColDef<InspectionReport> = {
  resizable: true,
  sortable: true,
};

export function InspectionReportsGrid() {
  return (
    <div className="overflow-x-auto" aria-label="검사성적서 목록">
      <div className="h-96 min-w-[780px]">
        <AgGridProvider modules={modules}>
          <AgGridReact
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowData={rowData}
            theme={daehanGridTheme}
          />
        </AgGridProvider>
      </div>
    </div>
  );
}
