alter table public.inspection_reports
  add column delivery_quantity_text text,
  add column sample_count_text text,
  add column delivery_date_text text;

alter table public.inspection_measurement_runs
  add column delivery_quantity_text text,
  add column sample_count_text text,
  add column delivery_date_text text;

update public.inspection_reports
set delivery_quantity_text = delivery_quantity::text,
    sample_count_text = sample_count::text,
    delivery_date_text = delivery_date::text
where not is_deleted;

update public.inspection_measurement_runs
set delivery_quantity_text = delivery_quantity::text,
    sample_count_text = sample_count::text,
    delivery_date_text = delivery_date::text;

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
  legacy_delivery_quantity integer;
  legacy_sample_count integer;
  legacy_delivery_date date;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(coalesce(p_delivery_quantity_text, '')) > 100
    or char_length(coalesce(p_sample_count_text, '')) > 100
    or char_length(coalesce(p_delivery_date_text, '')) > 100 then
    raise exception 'report text field too long' using errcode = '22023';
  end if;

  select delivery_quantity, sample_count, delivery_date
  into legacy_delivery_quantity, legacy_sample_count, legacy_delivery_date
  from public.inspection_reports
  where seq = p_inspection_report_seq;

  save_result := public.save_inspection_measurement_entry(
    p_inspection_report_seq,
    p_product_type_code_seq,
    p_event_type,
    p_model_name,
    p_item_detail_code,
    p_item_detail_name,
    p_customer_name,
    p_supplier_name,
    legacy_delivery_quantity,
    legacy_sample_count,
    legacy_delivery_date,
    p_material,
    p_hardness,
    p_heat_treatment,
    p_rows
  );

  saved_run_seq := (save_result ->> 'run_seq')::bigint;

  update public.inspection_reports
  set delivery_quantity_text = nullif(btrim(p_delivery_quantity_text), ''),
      sample_count_text = nullif(btrim(p_sample_count_text), ''),
      delivery_date_text = nullif(btrim(p_delivery_date_text), '')
  where seq = p_inspection_report_seq;

  update public.inspection_measurement_runs
  set delivery_quantity_text = nullif(btrim(p_delivery_quantity_text), ''),
      sample_count_text = nullif(btrim(p_sample_count_text), ''),
      delivery_date_text = nullif(btrim(p_delivery_date_text), '')
  where seq = saved_run_seq;

  return save_result;
end;
$$;

revoke all on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, text, text, integer, integer, date, text, text, text, jsonb) from authenticated;
revoke all on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, text, text, text, text, text, text, text, text, jsonb) to authenticated;

comment on column public.inspection_reports.delivery_quantity_text is '결과 입력에서 사용하는 납품수량 자유 입력 원문';
comment on column public.inspection_reports.sample_count_text is '결과 입력에서 사용하는 시료수 자유 입력 원문';
comment on column public.inspection_reports.delivery_date_text is '결과 입력에서 사용하는 납품일자 자유 입력 원문';
comment on column public.inspection_measurement_runs.delivery_quantity_text is '측정 당시 납품수량 자유 입력 원문';
comment on column public.inspection_measurement_runs.sample_count_text is '측정 당시 시료수 자유 입력 원문';
comment on column public.inspection_measurement_runs.delivery_date_text is '측정 당시 납품일자 자유 입력 원문';
