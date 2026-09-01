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
  current_item_count integer;
  supplied_existing_count integer;
  expected_count integer;
  affected_count integer;
  next_sort_order integer;
  next_run_no integer;
  normalized_rows jsonb := '[]'::jsonb;
  row_value jsonb;
  new_item_seq bigint;
  run_seq bigint;
  nominal_text text;
  tolerance_min_text text;
  tolerance_max_text text;
  tolerance_min_number numeric;
  tolerance_max_number numeric;
  tolerance_min_is_number boolean;
  tolerance_max_is_number boolean;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_event_type not in ('save', 'print') then raise exception 'invalid event type' using errcode = '22023'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 50 then raise exception 'invalid rows' using errcode = '22023'; end if;
  if nullif(btrim(p_model_name), '') is null
    or nullif(btrim(p_item_detail_code), '') is null
    or nullif(btrim(p_item_detail_name), '') is null
    or char_length(p_model_name) > 100
    or char_length(p_item_detail_code) > 100
    or char_length(p_item_detail_name) > 200
    or char_length(coalesce(p_customer_name, '')) > 100
    or char_length(coalesce(p_supplier_name, '')) > 100
    or char_length(coalesce(p_delivery_quantity_text, '')) > 100
    or char_length(coalesce(p_sample_count_text, '')) > 100
    or char_length(coalesce(p_delivery_date_text, '')) > 100
    or char_length(coalesce(p_material, '')) > 100
    or char_length(coalesce(p_hardness, '')) > 100
    or char_length(coalesce(p_heat_treatment, '')) > 100 then
    raise exception 'invalid report fields' using errcode = '22023';
  end if;

  perform 1 from public.inspection_reports r
  where r.seq = p_inspection_report_seq
    and not r.is_deleted
    and (r.created_by = actor_id or exists (select 1 from public.users u where u.id = actor_id and u.role = 'admin'))
  for update;
  if not found then raise exception 'report not found or forbidden' using errcode = '42501'; end if;

  if p_product_type_code_seq is not null and not exists (
    select 1 from public.code_details cd
    join public.code_groups cg on cg.seq = cd.code_group_seq
    where cd.seq = p_product_type_code_seq and cd.is_active and cg.group_code = 'U0002'
  ) then raise exception 'invalid product type' using errcode = '23514'; end if;

  select count(*), coalesce(max(sort_order), 0) + 1
  into current_item_count, next_sort_order
  from public.inspection_report_items
  where inspection_report_seq = p_inspection_report_seq;

  select count(distinct (entry.value ->> 'item_seq')::bigint)
  into supplied_existing_count
  from jsonb_array_elements(p_rows) as entry(value)
  where nullif(entry.value ->> 'item_seq', '') is not null;

  if supplied_existing_count <> current_item_count then
    raise exception 'measurement item count mismatch' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) as entry(value)
    where nullif(entry.value ->> 'item_seq', '') is not null
      and not exists (
        select 1 from public.inspection_report_items i
        where i.seq = (entry.value ->> 'item_seq')::bigint
          and i.inspection_report_seq = p_inspection_report_seq
      )
  ) then raise exception 'measurement item mismatch' using errcode = '22023'; end if;

  for row_value in select value from jsonb_array_elements(p_rows) loop
    if nullif(row_value ->> 'item_seq', '') is null then
      nominal_text := nullif(btrim(row_value ->> 'nominal_dimension'), '');
      tolerance_min_text := nullif(btrim(row_value ->> 'tolerance_min'), '');
      tolerance_max_text := nullif(btrim(row_value ->> 'tolerance_max'), '');
      if char_length(coalesce(nominal_text, '')) > 100
        or char_length(coalesce(tolerance_min_text, '')) > 100
        or char_length(coalesce(tolerance_max_text, '')) > 100 then
        raise exception 'new inspection item field too long' using errcode = '22023';
      end if;

      tolerance_min_is_number := false;
      tolerance_max_is_number := false;
      if tolerance_min_text is not null then
        begin
          tolerance_min_number := replace(tolerance_min_text, ',', '')::numeric;
          tolerance_min_is_number := true;
        exception when invalid_text_representation or numeric_value_out_of_range then
          tolerance_min_number := null;
        end;
      end if;
      if tolerance_max_text is not null then
        begin
          tolerance_max_number := replace(tolerance_max_text, ',', '')::numeric;
          tolerance_max_is_number := true;
        exception when invalid_text_representation or numeric_value_out_of_range then
          tolerance_max_number := null;
        end;
      end if;
      if tolerance_min_is_number and tolerance_max_is_number and tolerance_min_number > tolerance_max_number then
        raise exception 'invalid new inspection item tolerance order' using errcode = '22023';
      end if;

      insert into public.inspection_report_items (
        inspection_report_seq, sort_order, nominal_dimension, tolerance_min, tolerance_max,
        marker_x_ratio, marker_y_ratio, created_by, updated_by
      ) values (
        p_inspection_report_seq, next_sort_order, nominal_text, tolerance_min_text, tolerance_max_text,
        null, null, actor_id, actor_id
      ) returning seq into new_item_seq;

      insert into public.inspection_report_measurements (
        inspection_report_seq, inspection_report_item_seq, created_by, updated_by
      ) values (p_inspection_report_seq, new_item_seq, actor_id, actor_id);

      row_value := jsonb_set(row_value, '{item_seq}', to_jsonb(new_item_seq), true);
      next_sort_order := next_sort_order + 1;
    end if;
    normalized_rows := normalized_rows || jsonb_build_array(row_value);
  end loop;

  select count(*) into expected_count
  from public.inspection_report_items
  where inspection_report_seq = p_inspection_report_seq;

  update public.inspection_report_measurements m set
    result_1 = x.result_1, result_2 = x.result_2, result_3 = x.result_3, result_4 = x.result_4, result_5 = x.result_5,
    result_6 = x.result_6, result_7 = x.result_7, result_8 = x.result_8, result_9 = x.result_9, result_10 = x.result_10,
    note = nullif(btrim(x.note), '')
  from jsonb_to_recordset(normalized_rows) as x(item_seq bigint, result_1 numeric, result_2 numeric, result_3 numeric, result_4 numeric, result_5 numeric, result_6 numeric, result_7 numeric, result_8 numeric, result_9 numeric, result_10 numeric, note text)
  where m.inspection_report_seq = p_inspection_report_seq and m.inspection_report_item_seq = x.item_seq;
  get diagnostics affected_count = row_count;
  if affected_count <> expected_count then raise exception 'measurement update count mismatch' using errcode = '22023'; end if;

  select coalesce(max(run_no), 0) + 1 into next_run_no
  from public.inspection_measurement_runs
  where inspection_report_seq = p_inspection_report_seq;

  insert into public.inspection_measurement_runs (
    inspection_report_seq, run_no, event_type, model_name, item_seq, item_code,
    item_detail_seq, item_detail_code, item_detail_name, item_name,
    customer_name, supplier_name, delivery_quantity, sample_count, delivery_date,
    delivery_quantity_text, sample_count_text, delivery_date_text,
    product_type_code_seq, product_type_code, product_type_name,
    material, hardness, heat_treatment, image_path, created_by, updated_by
  )
  select r.seq, next_run_no, p_event_type, btrim(p_model_name), r.item_seq, r.item_code,
    r.item_detail_seq, btrim(p_item_detail_code), btrim(p_item_detail_name), r.item_name,
    nullif(btrim(p_customer_name), ''), nullif(btrim(p_supplier_name), ''),
    r.delivery_quantity, r.sample_count, r.delivery_date,
    nullif(btrim(p_delivery_quantity_text), ''), nullif(btrim(p_sample_count_text), ''), nullif(btrim(p_delivery_date_text), ''),
    p_product_type_code_seq, cd.code, cd.code_name,
    nullif(btrim(p_material), ''), nullif(btrim(p_hardness), ''), nullif(btrim(p_heat_treatment), ''),
    r.image_path, actor_id, actor_id
  from public.inspection_reports r
  left join public.code_details cd on cd.seq = p_product_type_code_seq
  where r.seq = p_inspection_report_seq
  returning seq into run_seq;

  insert into public.inspection_measurement_run_items (
    measurement_run_seq, source_report_item_seq, sort_order, nominal_dimension, tolerance_min, tolerance_max,
    marker_x_ratio, marker_y_ratio, result_1, result_2, result_3, result_4, result_5, result_6,
    result_7, result_8, result_9, result_10, note, created_by, updated_by
  )
  select run_seq, i.seq, i.sort_order, i.nominal_dimension, i.tolerance_min, i.tolerance_max,
    i.marker_x_ratio, i.marker_y_ratio, m.result_1, m.result_2, m.result_3, m.result_4, m.result_5,
    m.result_6, m.result_7, m.result_8, m.result_9, m.result_10, m.note, actor_id, actor_id
  from public.inspection_report_items i
  join public.inspection_report_measurements m on m.inspection_report_item_seq = i.seq
  where i.inspection_report_seq = p_inspection_report_seq
  order by i.sort_order;

  return jsonb_build_object(
    'run_seq', run_seq,
    'item_seqs', (
      select coalesce(jsonb_agg((entry.value ->> 'item_seq')::bigint), '[]'::jsonb)
      from jsonb_array_elements(normalized_rows) as entry(value)
    )
  );
end;
$$;

comment on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, text, text, text, text, text, text, text, text, jsonb) is
  '검사성적서 마스터는 변경하지 않고 측정 최신값과 당시 표제정보 이력만 저장한다';
