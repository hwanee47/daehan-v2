export type InspectionReport = {
  seq: number;
  model_name: string;
  item_seq: number;
  item_code: string;
  item_name: string;
  item_detail_seq: number;
  item_detail_code: string;
  item_detail_name: string;
  material: string | null;
  image_path: string | null;
  image_url: string | null;
  customer_name: string | null;
  supplier_name: string | null;
  delivery_quantity: number | null;
  sample_count: number | null;
  delivery_date: string | null;
  delivery_quantity_text: string | null;
  sample_count_text: string | null;
  delivery_date_text: string | null;
  product_type_code_seq: number | null;
  product_type_code: string | null;
  product_type_name: string | null;
  hardness: string | null;
  heat_treatment: string | null;
  final_judgment_code_seq: number | null;
};

export type InspectionReportItem = {
  seq: number;
  sort_order: number;
  inspection_report_seq: number;
  nominal_dimension: string | null;
  tolerance_min: string | null;
  tolerance_max: string | null;
  marker_x_ratio: number | null;
  marker_y_ratio: number | null;
};

export type InspectionReportMeasurement = {
  seq: number;
  inspection_report_seq: number;
  inspection_report_item_seq: number;
  result_1: number | null;
  result_2: number | null;
  result_3: number | null;
  result_4: number | null;
  result_5: number | null;
  result_6: number | null;
  result_7: number | null;
  result_8: number | null;
  result_9: number | null;
  result_10: number | null;
  note: string | null;
};

export type InspectionMeasurementRun = {
  seq: number;
  inspection_report_seq: number;
  run_no: number;
  event_type: "save" | "print" | "migration";
  model_name: string;
  item_seq: number;
  item_code: string;
  item_detail_seq: number;
  item_detail_code: string;
  item_detail_name: string | null;
  item_name: string | null;
  customer_name: string | null;
  supplier_name: string | null;
  delivery_quantity: number | null;
  sample_count: number | null;
  delivery_date: string | null;
  delivery_quantity_text: string | null;
  sample_count_text: string | null;
  delivery_date_text: string | null;
  product_type_code_seq: number | null;
  product_type_code: string | null;
  product_type_name: string | null;
  material: string | null;
  hardness: string | null;
  heat_treatment: string | null;
  image_path: string | null;
  image_url: string | null;
  created_at: string;
};

export type InspectionMeasurementRunItem = Omit<InspectionReportMeasurement, "inspection_report_seq" | "inspection_report_item_seq"> & {
  measurement_run_seq: number;
  source_report_item_seq: number | null;
  sort_order: number;
  nominal_dimension: string | null;
  tolerance_min: string | null;
  tolerance_max: string | null;
  marker_x_ratio: number | null;
  marker_y_ratio: number | null;
};

export type InspectionItemOption = {
  seq: number;
  item_detail_code: string;
  item_detail_name: string;
  material: string | null;
  image_url: string | null;
  item_name: string;
  model_name: string | null;
};

export type InspectionCodeOption = {
  seq: number;
  group_code: "U0001" | "U0002" | "U0003" | "FINAL_JUDGMENT_STATUS";
  code: string;
  code_name: string;
};

export type InspectionReportData = {
  reports: InspectionReport[];
  items: InspectionReportItem[];
  measurements: InspectionReportMeasurement[];
  measurementRuns: InspectionMeasurementRun[];
  measurementRunItems: InspectionMeasurementRunItem[];
  itemOptions: InspectionItemOption[];
  codes: InspectionCodeOption[];
  hasError: boolean;
};

export type InspectionReportSearchField = "all" | "model" | "drawing" | "itemName" | "customer" | "supplier";
export type InspectionReportSortOrder = "newest" | "oldest";

export type InspectionReportQuery = {
  searchField: InspectionReportSearchField;
  keyword: string;
  sortOrder: InspectionReportSortOrder;
  page: number;
};

export type InspectionReportPage = {
  rows: InspectionReport[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
};

export type InspectionReportActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  reportSeq?: number;
  runSeq?: number;
  itemSeqs?: Array<number | null>;
  eventType?: "save" | "print";
};

export type InspectionReportDraftItem = {
  seq?: number;
  nominalDimension: string;
  toleranceMin: string;
  toleranceMax: string;
  results: string[];
  note: string;
  markerXRatio: number | null;
  markerYRatio: number | null;
  isDirectCode?: boolean;
};

export type InspectionToleranceRange = {
  seq: number;
  nominal_min: number;
  nominal_max: number;
  upper_deviation: number;
  lower_deviation: number;
};

export type InspectionToleranceRangeResult = {
  ranges: InspectionToleranceRange[];
  error: string | null;
};
