with judgment_group as (
  select seq
  from public.code_groups
  where group_code = 'FINAL_JUDGMENT_STATUS'
)
insert into public.code_details (
  code_group_seq,
  code,
  code_name,
  description,
  sort_order,
  is_active
)
select judgment_group.seq, values_to_insert.code, values_to_insert.code_name,
  values_to_insert.description, values_to_insert.sort_order, true
from judgment_group
cross join (
  values
    ('PASS', '합격', '검사성적서 최종 판정 합격', 10),
    ('FAIL', '불합격', '검사성적서 최종 판정 불합격', 20)
) as values_to_insert(code, code_name, description, sort_order)
on conflict (code_group_seq, code) do update
set code_name = excluded.code_name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true;

alter table public.inspection_reports
  add column special_notes text,
  add column inspector_name text,
  add column inspection_date date;

alter table public.inspection_reports
  add constraint inspection_reports_special_notes_length
    check (char_length(coalesce(special_notes, '')) <= 1000),
  add constraint inspection_reports_inspector_name_valid
    check (inspector_name is null or btrim(inspector_name) <> '' and char_length(inspector_name) <= 100);

alter table public.inspection_measurement_runs
  add column special_notes text,
  add column final_judgment_code_seq bigint references public.code_details (seq) on delete restrict,
  add column final_judgment_code text,
  add column final_judgment_name text,
  add column inspector_name text,
  add column inspection_date date;

alter table public.inspection_measurement_runs
  add constraint inspection_measurement_runs_special_notes_length
    check (char_length(coalesce(special_notes, '')) <= 1000),
  add constraint inspection_measurement_runs_inspector_name_valid
    check (inspector_name is null or btrim(inspector_name) <> '' and char_length(inspector_name) <= 100);

comment on column public.inspection_reports.special_notes is '현재 결과 입력의 특기사항';
comment on column public.inspection_reports.inspector_name is '현재 결과 입력의 검사자 이름';
comment on column public.inspection_reports.inspection_date is '현재 결과 입력의 검사일자';
comment on column public.inspection_measurement_runs.special_notes is '측정 당시 특기사항 스냅샷';
comment on column public.inspection_measurement_runs.final_judgment_code_seq is '측정 당시 FINAL_JUDGMENT_STATUS 코드 seq';
comment on column public.inspection_measurement_runs.final_judgment_code is '측정 당시 최종 판정 코드 스냅샷';
comment on column public.inspection_measurement_runs.final_judgment_name is '측정 당시 최종 판정명 스냅샷';
comment on column public.inspection_measurement_runs.inspector_name is '측정 당시 검사자 이름 스냅샷';
comment on column public.inspection_measurement_runs.inspection_date is '측정 당시 검사일자';

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
    or nullif(btrim(p_inspector_name), '') is null
    or char_length(p_inspector_name) > 100
    or p_inspection_date is null then
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
      inspector_name = btrim(p_inspector_name),
      inspection_date = p_inspection_date
  where seq = p_inspection_report_seq;

  update public.inspection_measurement_runs
  set special_notes = nullif(btrim(p_special_notes), ''),
      final_judgment_code_seq = p_final_judgment_code_seq,
      final_judgment_code = judgment_code,
      final_judgment_name = judgment_name,
      inspector_name = btrim(p_inspector_name),
      inspection_date = p_inspection_date
  where seq = saved_run_seq;

  return save_result;
end;
$$;

revoke all on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, text, text, text, text, text, text, text, text, jsonb) from authenticated;
revoke all on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, text, text, text, text, text, text, text, text, text, bigint, text, date, jsonb) from public, anon, authenticated;
grant execute on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, text, text, text, text, text, text, text, text, text, bigint, text, date, jsonb) to authenticated;

comment on function public.save_inspection_measurement_entry(bigint, bigint, text, text, text, text, text, text, text, text, text, text, text, text, text, bigint, text, date, jsonb) is
  '결과 입력의 성적서 정보, 최종 판정, 검사정보와 측정 회차 스냅샷을 원자적으로 저장한다';
