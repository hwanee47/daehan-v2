export type CodeGroup = {
  seq: number;
  group_code: string;
  group_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type CodeDetail = {
  seq: number;
  code_group_seq: number;
  code: string;
  code_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type CodeActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string>;
};
