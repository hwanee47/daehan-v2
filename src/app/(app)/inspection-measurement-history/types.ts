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
