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

export type MeasurementItemGroup = {
  item_seq: number;
  item_code: string;
  item_name: string;
  model_name: string;
  item_detail_count: number;
  run_count: number;
  latest_created_at: string;
};

export type MeasurementItemGroupPage = {
  rows: MeasurementItemGroup[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
};
