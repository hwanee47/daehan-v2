alter table public.inspection_reports
  add column delivery_date date;

alter table public.inspection_measurement_runs
  add column delivery_date date;

create or replace function public.save_inspection_measurement_entry(
  p_inspection_report_seq bigint,
  p_product_type_code_seq bigint,
  p_event_type text,
  p_model_name text,
  p_item_detail_code text,
  p_item_detail_name text,
  p_customer_name text,
  p_supplier_name text,
  p_delivery_quantity integer,
  p_sample_count integer,
  p_delivery_date date,
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
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if nullif(btrim(p_model_name), '') is null
    or nullif(btrim(p_item_detail_code), '') is null
    or nullif(btrim(p_item_detail_name), '') is null
    or char_length(p_model_name) > 100
    or char_length(p_item_detail_code) > 100
    or char_length(p_item_detail_name) > 200
    or char_length(coalesce(p_customer_name, '')) > 100
    or char_length(coalesce(p_supplier_name, '')) > 100
    or p_delivery_quantity is not null and p_delivery_quantity <= 0
    or p_sample_count is not null and (p_sample_count <= 0 or p_sample_count > 10)
    or p_delivery_quantity is not null and p_sample_count is not null and p_sample_count > p_delivery_quantity then
    raise exception 'invalid report fields' using errcode = '22023';
  end if;

  perform 1 from public.inspection_reports r
  where r.seq = p_inspection_report_seq
    and not r.is_deleted
    and (r.created_by = actor_id or exists (select 1 from public.users u where u.id = actor_id and u.role = 'admin'))
  for update;
  if not found then raise exception 'report not found or forbidden' using errcode = '42501'; end if;

  update public.inspection_reports
  set model_name = btrim(p_model_name),
      item_detail_code = btrim(p_item_detail_code),
      item_detail_name = btrim(p_item_detail_name),
      customer_name = nullif(btrim(p_customer_name), ''),
      supplier_name = nullif(btrim(p_supplier_name), ''),
      delivery_quantity = p_delivery_quantity,
      sample_count = p_sample_count,
      delivery_date = p_delivery_date
  where seq = p_inspection_report_seq;

  save_result := public.save_inspection_measurement_entry(
    p_inspection_report_seq,
    p_product_type_code_seq,
    p_event_type,
    p_material,
    p_hardness,
    p_heat_treatment,
    p_rows
  );

  saved_run_seq := (save_result ->> 'run_seq')::bigint;
  update public.inspection_measurement_runs
  set model_name = btrim(p_model_name),
      item_detail_code = btrim(p_item_detail_code),
      item_detail_name = btrim(p_item_detail_name),
      customer_name = nullif(btrim(p_customer_name), ''),
      supplier_name = nullif(btrim(p_supplier_name), ''),
      delivery_quantity = p_delivery_quantity,
      sample_count = p_sample_count,
      delivery_date = p_delivery_date,
      material = nullif(btrim(p_material), ''),
      hardness = nullif(btrim(p_hardness), ''),
      heat_treatment = nullif(btrim(p_heat_treatment), '')
  where seq = saved_run_seq;

  return save_result;
end;
$$;

revoke all on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, jsonb) from authenticated;
revoke all on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, text, text, integer, integer, date, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, text, text, integer, integer, date, text, text, text, jsonb) to authenticated;

comment on column public.inspection_reports.delivery_date is '검사성적서 최신 납품일자';
comment on column public.inspection_measurement_runs.delivery_date is '측정 당시 납품일자 스냅샷';
