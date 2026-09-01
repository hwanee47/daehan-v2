grant update (material) on table public.inspection_reports to authenticated;

create or replace function public.save_inspection_measurement_entry(
  p_inspection_report_seq bigint,
  p_product_type_code_seq bigint,
  p_event_type text,
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
  next_sort_order integer;
  normalized_rows jsonb := '[]'::jsonb;
  row_value jsonb;
  new_item_seq bigint;
  run_seq bigint;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_event_type not in ('save', 'print') then raise exception 'invalid event type' using errcode = '22023'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 50 then raise exception 'invalid rows' using errcode = '22023'; end if;
  if char_length(coalesce(p_material, '')) > 100 or char_length(coalesce(p_hardness, '')) > 100 or char_length(coalesce(p_heat_treatment, '')) > 100 then
    raise exception 'report field too long' using errcode = '22023';
  end if;

  perform 1 from public.inspection_reports r
  where r.seq = p_inspection_report_seq
    and (r.created_by = actor_id or exists (select 1 from public.users u where u.id = actor_id and u.role = 'admin'))
  for update;
  if not found then raise exception 'report not found or forbidden' using errcode = '42501'; end if;

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

  update public.inspection_reports
  set material = nullif(btrim(p_material), ''),
      hardness = nullif(btrim(p_hardness), ''),
      heat_treatment = nullif(btrim(p_heat_treatment), '')
  where seq = p_inspection_report_seq;

  for row_value in select value from jsonb_array_elements(p_rows) loop
    if nullif(row_value ->> 'item_seq', '') is null then
      if nullif(btrim(row_value ->> 'nominal_dimension'), '') is null
        or char_length(btrim(row_value ->> 'nominal_dimension')) > 100
        or nullif(row_value ->> 'tolerance_min', '') is null
        or nullif(row_value ->> 'tolerance_max', '') is null
        or (row_value ->> 'tolerance_min')::numeric > (row_value ->> 'tolerance_max')::numeric then
        raise exception 'invalid new inspection item' using errcode = '22023';
      end if;

      insert into public.inspection_report_items (
        inspection_report_seq, sort_order, nominal_dimension, tolerance_min, tolerance_max,
        marker_x_ratio, marker_y_ratio, created_by, updated_by
      ) values (
        p_inspection_report_seq, next_sort_order, btrim(row_value ->> 'nominal_dimension'),
        (row_value ->> 'tolerance_min')::numeric, (row_value ->> 'tolerance_max')::numeric,
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

  run_seq := public.save_inspection_measurement_run(
    p_inspection_report_seq,
    p_product_type_code_seq,
    p_event_type,
    normalized_rows
  );

  return jsonb_build_object(
    'run_seq', run_seq,
    'item_seqs', (
      select coalesce(jsonb_agg((entry.value ->> 'item_seq')::bigint), '[]'::jsonb)
      from jsonb_array_elements(normalized_rows) as entry(value)
    )
  );
end;
$$;

revoke all on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, jsonb) to authenticated;

comment on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, jsonb) is
  '성적서 기본정보 보완, 신규 검사항목 생성과 측정 이력 저장을 하나의 트랜잭션으로 처리';
