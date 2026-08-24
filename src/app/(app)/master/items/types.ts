export type Item = {
  seq: number;
  item_code: string;
  item_name: string;
  model_name: string | null;
  note: string | null;
};

export type ItemDetail = {
  seq: number;
  item_seq: number;
  item_detail_code: string;
  item_detail_name: string;
  material: string | null;
  note: string | null;
};

export type ItemActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string>;
};
