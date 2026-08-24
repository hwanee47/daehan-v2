export type ToleranceItem = {
  seq: number;
  item_code: string;
  item_name: string;
  model_name: string | null;
};

export type ItemToleranceRange = {
  seq: number;
  item_seq: number;
  nominal_min: number;
  nominal_max: number;
  upper_deviation: number;
  lower_deviation: number;
  note: string | null;
};

export type ToleranceActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string>;
};
