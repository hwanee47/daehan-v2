import type { InspectionMeasurementRun, InspectionMeasurementRunItem } from "../inspection-reports/types";

export type MeasurementHistorySearchField = "" | "model" | "drawing" | "itemName" | "customer";

export type MeasurementHistoryFilters = {
  dateFrom: string;
  dateTo: string;
  searchField: MeasurementHistorySearchField;
  keyword: string;
};

export type MeasurementHistoryQuery = MeasurementHistoryFilters & { page: number };

export type MeasurementHistoryPage = {
  rows: InspectionMeasurementRun[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
};

export type MeasurementHistoryDetail = {
  run: InspectionMeasurementRun | null;
  items: InspectionMeasurementRunItem[];
  error: string | null;
};

export type MeasurementModelGroup = {
  model_name: string;
  report_count: number;
  run_count: number;
  latest_created_at: string;
};

export type MeasurementModelGroupPage = {
  rows: MeasurementModelGroup[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
};

export type MeasurementModelReport = {
  inspection_report_seq: number;
  item_code: string;
  item_detail_code: string;
  item_detail_name: string;
  customer_name: string | null;
  history_count: number;
  latest_created_at: string;
};

export type MeasurementModelReportPage = {
  rows: MeasurementModelReport[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
};
