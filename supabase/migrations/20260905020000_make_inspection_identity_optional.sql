create or replace function public.save_inspection_measurement_entry(
  p_inspection_report_seq bigint,
  p_product_type_code_seq bigint,
  p_event_type text,
  p_model_name text,
  p_item_detail_code text,
  p_item_detail_name text,
  p_customer_name text,
  p_supplier_name text,
  p_delivery_quantity_text text,
  p_sample_count_text text,
  p_delivery_date_text text,
  p_material text,
  p_hardness text,
  p_heat_treatment text,
  p_special_notes text,
  p_final_judgment_code_seq bigint,
  p_inspector_name text,
  p_inspection_date date,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  save_result jsonb;
  saved_run_seq bigint;
  judgment_code text;
  judgment_name text;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(coalesce(p_special_notes, '')) > 1000
    or char_length(coalesce(p_inspector_name, '')) > 100 then
    raise exception 'invalid inspection fields' using errcode = '22023';
  end if;
  select detail.code, detail.code_name
  into judgment_code, judgment_name
  from public.code_details as detail
  join public.code_groups as code_group on code_group.seq = detail.code_group_seq
  where detail.seq = p_final_judgment_code_seq
    and detail.is_active
    and code_group.is_active
    and code_group.group_code = 'FINAL_JUDGMENT_STATUS'
    and detail.code in ('PASS', 'FAIL');

  if judgment_code is null then
    raise exception 'invalid final judgment' using errcode = '23514';
  end if;

  save_result := public.save_inspection_measurement_entry(
    p_inspection_report_seq,
    p_product_type_code_seq,
    p_event_type,
    p_model_name,
    p_item_detail_code,
    p_item_detail_name,
    p_customer_name,
    p_supplier_name,
    p_delivery_quantity_text,
    p_sample_count_text,
    p_delivery_date_text,
    p_material,
    p_hardness,
    p_heat_treatment,
    p_rows
  );

  saved_run_seq := (save_result ->> 'run_seq')::bigint;

  update public.inspection_reports
  set special_notes = nullif(btrim(p_special_notes), ''),
      final_judgment_code_seq = p_final_judgment_code_seq,
      inspector_name = nullif(btrim(p_inspector_name), ''),
      inspection_date = p_inspection_date
  where seq = p_inspection_report_seq;

  update public.inspection_measurement_runs
  set special_notes = nullif(btrim(p_special_notes), ''),
      final_judgment_code_seq = p_final_judgment_code_seq,
      final_judgment_code = judgment_code,
      final_judgment_name = judgment_name,
      inspector_name = nullif(btrim(p_inspector_name), ''),
      inspection_date = p_inspection_date
  where seq = saved_run_seq;

  return save_result;
end;
$$;

comment on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, text, text, text, text, text, text, text, text, text, bigint, text, date, jsonb) is
  '결과 입력의 성적서 정보, 최종 판정과 선택 검사정보를 측정 회차 스냅샷과 함께 원자적으로 저장한다';
