alter table public.inspection_report_items
  drop constraint inspection_report_items_tolerance_order,
  alter column tolerance_min type text using trim_scale(tolerance_min)::text,
  alter column tolerance_max type text using trim_scale(tolerance_max)::text;

alter table public.inspection_report_items
  add constraint inspection_report_items_tolerance_min_text_check
    check (tolerance_min is null or (nullif(btrim(tolerance_min), '') is not null and char_length(tolerance_min) <= 100)),
  add constraint inspection_report_items_tolerance_max_text_check
    check (tolerance_max is null or (nullif(btrim(tolerance_max), '') is not null and char_length(tolerance_max) <= 100));

alter table public.inspection_measurement_run_items
  drop constraint inspection_measurement_run_items_tolerance_order,
  alter column tolerance_min type text using trim_scale(tolerance_min)::text,
  alter column tolerance_max type text using trim_scale(tolerance_max)::text;

alter table public.inspection_measurement_run_items
  add constraint inspection_measurement_run_items_tolerance_min_text_check
    check (tolerance_min is null or (nullif(btrim(tolerance_min), '') is not null and char_length(tolerance_min) <= 100)),
  add constraint inspection_measurement_run_items_tolerance_max_text_check
    check (tolerance_max is null or (nullif(btrim(tolerance_max), '') is not null and char_length(tolerance_max) <= 100));

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
        p_inspection_report_seq, next_sort_order, nominal_text,
        tolerance_min_text, tolerance_max_text,
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

comment on column public.inspection_report_items.tolerance_min is '선택 입력 가능한 최소 공차 원문';
comment on column public.inspection_report_items.tolerance_max is '선택 입력 가능한 최대 공차 원문';
comment on column public.inspection_measurement_run_items.tolerance_min is '측정 당시 최소 공차 원문 스냅샷';
comment on column public.inspection_measurement_run_items.tolerance_max is '측정 당시 최대 공차 원문 스냅샷';
