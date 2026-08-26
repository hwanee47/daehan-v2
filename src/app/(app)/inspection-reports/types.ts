export type InspectionReport = {
  seq: number;
  model_name: string;
  item_detail_seq: number;
  item_detail_code: string;
  customer_name: string | null;
  supplier_name: string | null;
  delivery_quantity: number | null;
  sample_count: number | null;
  product_type_code_seq: number | null;
  hardness: string | null;
  heat_treatment: string | null;
  final_judgment_code_seq: number | null;
};

export type InspectionReportItem = {
  seq: number;
  sort_order: number;
  inspection_report_seq: number;
  nominal_dimension: number;
  tolerance_min: number;
  tolerance_max: number;
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
  group_code: "PRODUCT_TYPE" | "FINAL_JUDGMENT_STATUS";
  code: string;
  code_name: string;
};

export type InspectionReportData = {
  reports: InspectionReport[];
  items: InspectionReportItem[];
  measurements: InspectionReportMeasurement[];
  itemOptions: InspectionItemOption[];
  codes: InspectionCodeOption[];
  hasError: boolean;
};

export type InspectionReportActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  reportSeq?: number;
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
};
