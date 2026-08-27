create table public.inspection_measurement_runs (
  seq bigint generated always as identity primary key,
  inspection_report_seq bigint not null references public.inspection_reports (seq) on delete cascade,
  run_no integer not null,
  event_type text not null,
  model_name text not null,
  item_detail_seq bigint not null,
  item_detail_code text not null,
  item_detail_name text,
  item_name text,
  customer_name text,
  supplier_name text,
  delivery_quantity integer,
  sample_count integer,
  product_type_code_seq bigint,
  product_type_code text,
  product_type_name text,
  material text,
  hardness text,
  heat_treatment text,
  image_path text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint inspection_measurement_runs_run_no_positive check (run_no > 0),
  constraint inspection_measurement_runs_event_type check (event_type in ('save', 'print', 'migration')),
  constraint inspection_measurement_runs_report_run_unique unique (inspection_report_seq, run_no)
);

create table public.inspection_measurement_run_items (
  seq bigint generated always as identity primary key,
  measurement_run_seq bigint not null references public.inspection_measurement_runs (seq) on delete cascade,
  source_report_item_seq bigint,
  sort_order integer not null,
  nominal_dimension numeric(14, 4) not null,
  tolerance_min numeric(14, 4) not null,
  tolerance_max numeric(14, 4) not null,
  marker_x_ratio numeric(8, 7),
  marker_y_ratio numeric(8, 7),
  result_1 numeric(14, 4),
  result_2 numeric(14, 4),
  result_3 numeric(14, 4),
  result_4 numeric(14, 4),
  result_5 numeric(14, 4),
  result_6 numeric(14, 4),
  result_7 numeric(14, 4),
  result_8 numeric(14, 4),
  result_9 numeric(14, 4),
  result_10 numeric(14, 4),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint inspection_measurement_run_items_sort_positive check (sort_order > 0),
  constraint inspection_measurement_run_items_tolerance_order check (tolerance_min <= tolerance_max),
  constraint inspection_measurement_run_items_marker_pair check (
    (marker_x_ratio is null and marker_y_ratio is null)
    or (marker_x_ratio between 0 and 1 and marker_y_ratio between 0 and 1)
  ),
  constraint inspection_measurement_run_items_run_sort_unique unique (measurement_run_seq, sort_order)
);

comment on table public.inspection_measurement_runs is '저장 또는 인쇄 시점의 검사성적서 전체 정보 스냅샷';
comment on table public.inspection_measurement_run_items is '검사성적서 측정 회차별 검사항목과 결과 스냅샷';
comment on column public.inspection_measurement_runs.event_type is '이력 생성 원인: save, print, migration';
comment on column public.inspection_measurement_runs.image_path is '이력 생성 당시 품목상세 이미지 Storage 경로';

create index inspection_measurement_runs_report_latest_idx
on public.inspection_measurement_runs (inspection_report_seq, run_no desc);

create index inspection_measurement_runs_report_created_idx
on public.inspection_measurement_runs (inspection_report_seq, created_at desc);

create index inspection_measurement_run_items_run_order_idx
on public.inspection_measurement_run_items (measurement_run_seq, sort_order);

create trigger inspection_measurement_runs_set_audit_fields
before insert or update on public.inspection_measurement_runs
for each row execute function public.set_audit_fields();

create trigger inspection_measurement_run_items_set_audit_fields
before insert or update on public.inspection_measurement_run_items
for each row execute function public.set_audit_fields();

alter table public.inspection_measurement_runs enable row level security;
alter table public.inspection_measurement_run_items enable row level security;

create policy "inspection_measurement_runs_select_authenticated"
on public.inspection_measurement_runs for select to authenticated using (true);

create policy "inspection_measurement_run_items_select_authenticated"
on public.inspection_measurement_run_items for select to authenticated using (true);

revoke all on table public.inspection_measurement_runs from anon, authenticated;
revoke all on table public.inspection_measurement_run_items from anon, authenticated;
grant select on table public.inspection_measurement_runs to authenticated;
grant select on table public.inspection_measurement_run_items to authenticated;

create or replace function public.save_inspection_measurement_run(
  p_inspection_report_seq bigint,
  p_product_type_code_seq bigint,
  p_event_type text,
  p_rows jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  new_run_seq bigint;
  next_run_no integer;
  expected_count integer;
  supplied_count integer;
  affected_count integer;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_event_type not in ('save', 'print') then raise exception 'invalid event type' using errcode = '22023'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'invalid rows' using errcode = '22023'; end if;

  perform 1 from public.inspection_reports r
  where r.seq = p_inspection_report_seq
    and (r.created_by = actor_id or exists (select 1 from public.users u where u.id = actor_id and u.role = 'admin'))
  for update;
  if not found then raise exception 'report not found or forbidden' using errcode = '42501'; end if;

  if p_product_type_code_seq is not null and not exists (
    select 1 from public.code_details cd join public.code_groups cg on cg.seq = cd.code_group_seq
    where cd.seq = p_product_type_code_seq and cd.is_active and cg.group_code = 'U0002'
  ) then raise exception 'invalid product type' using errcode = '23514'; end if;

  select count(*) into expected_count from public.inspection_report_items where inspection_report_seq = p_inspection_report_seq;
  select count(*), count(distinct x.item_seq) into supplied_count, affected_count
  from jsonb_to_recordset(p_rows) as x(item_seq bigint, result_1 numeric, result_2 numeric, result_3 numeric, result_4 numeric, result_5 numeric, result_6 numeric, result_7 numeric, result_8 numeric, result_9 numeric, result_10 numeric, note text);
  if supplied_count <> expected_count or affected_count <> expected_count then raise exception 'measurement item count mismatch' using errcode = '22023'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_rows) as x(item_seq bigint)
    where not exists (select 1 from public.inspection_report_items i where i.seq = x.item_seq and i.inspection_report_seq = p_inspection_report_seq)
  ) then raise exception 'measurement item mismatch' using errcode = '22023'; end if;

  update public.inspection_reports set product_type_code_seq = p_product_type_code_seq where seq = p_inspection_report_seq;

  update public.inspection_report_measurements m set
    result_1 = x.result_1, result_2 = x.result_2, result_3 = x.result_3, result_4 = x.result_4, result_5 = x.result_5,
    result_6 = x.result_6, result_7 = x.result_7, result_8 = x.result_8, result_9 = x.result_9, result_10 = x.result_10,
    note = nullif(btrim(x.note), '')
  from jsonb_to_recordset(p_rows) as x(item_seq bigint, result_1 numeric, result_2 numeric, result_3 numeric, result_4 numeric, result_5 numeric, result_6 numeric, result_7 numeric, result_8 numeric, result_9 numeric, result_10 numeric, note text)
  where m.inspection_report_seq = p_inspection_report_seq and m.inspection_report_item_seq = x.item_seq;
  get diagnostics affected_count = row_count;
  if affected_count <> expected_count then raise exception 'measurement update count mismatch' using errcode = '22023'; end if;

  select coalesce(max(run_no), 0) + 1 into next_run_no from public.inspection_measurement_runs where inspection_report_seq = p_inspection_report_seq;

  insert into public.inspection_measurement_runs (
    inspection_report_seq, run_no, event_type, model_name, item_detail_seq, item_detail_code,
    item_detail_name, item_name, customer_name, supplier_name, delivery_quantity, sample_count,
    product_type_code_seq, product_type_code, product_type_name, material, hardness, heat_treatment,
    image_path, created_by, updated_by
  )
  select r.seq, next_run_no, p_event_type, r.model_name, r.item_detail_seq, r.item_detail_code,
    d.item_detail_name, it.item_name, r.customer_name, r.supplier_name, r.delivery_quantity, r.sample_count,
    r.product_type_code_seq, cd.code, cd.code_name, d.material, r.hardness, r.heat_treatment,
    d.image_path, actor_id, actor_id
  from public.inspection_reports r
  left join public.item_details d on d.seq = r.item_detail_seq
  left join public.items it on it.seq = d.item_seq
  left join public.code_details cd on cd.seq = r.product_type_code_seq
  where r.seq = p_inspection_report_seq
  returning seq into new_run_seq;

  insert into public.inspection_measurement_run_items (
    measurement_run_seq, source_report_item_seq, sort_order, nominal_dimension, tolerance_min, tolerance_max,
    marker_x_ratio, marker_y_ratio, result_1, result_2, result_3, result_4, result_5, result_6,
    result_7, result_8, result_9, result_10, note, created_by, updated_by
  )
  select new_run_seq, i.seq, i.sort_order, i.nominal_dimension, i.tolerance_min, i.tolerance_max,
    i.marker_x_ratio, i.marker_y_ratio, m.result_1, m.result_2, m.result_3, m.result_4, m.result_5,
    m.result_6, m.result_7, m.result_8, m.result_9, m.result_10, m.note, actor_id, actor_id
  from public.inspection_report_items i
  join public.inspection_report_measurements m on m.inspection_report_item_seq = i.seq
  where i.inspection_report_seq = p_inspection_report_seq
  order by i.sort_order;

  return new_run_seq;
end;
$$;

revoke all on function public.save_inspection_measurement_run(bigint, bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_inspection_measurement_run(bigint, bigint, text, jsonb) to authenticated;

with reports_with_values as (
  select distinct r.seq
  from public.inspection_reports r
  join public.inspection_report_measurements m on m.inspection_report_seq = r.seq
  where m.result_1 is not null or m.result_2 is not null or m.result_3 is not null or m.result_4 is not null
     or m.result_5 is not null or m.result_6 is not null or m.result_7 is not null or m.result_8 is not null
     or m.result_9 is not null or m.result_10 is not null or nullif(btrim(m.note), '') is not null
), inserted_runs as (
  insert into public.inspection_measurement_runs (
    inspection_report_seq, run_no, event_type, model_name, item_detail_seq, item_detail_code,
    item_detail_name, item_name, customer_name, supplier_name, delivery_quantity, sample_count,
    product_type_code_seq, product_type_code, product_type_name, material, hardness, heat_treatment,
    image_path, created_at, created_by, updated_at, updated_by
  )
  select r.seq, 1, 'migration', r.model_name, r.item_detail_seq, r.item_detail_code,
    d.item_detail_name, it.item_name, r.customer_name, r.supplier_name, r.delivery_quantity, r.sample_count,
    r.product_type_code_seq, cd.code, cd.code_name, d.material, r.hardness, r.heat_treatment,
    d.image_path, r.updated_at, r.updated_by, r.updated_at, r.updated_by
  from public.inspection_reports r
  join reports_with_values v on v.seq = r.seq
  left join public.item_details d on d.seq = r.item_detail_seq
  left join public.items it on it.seq = d.item_seq
  left join public.code_details cd on cd.seq = r.product_type_code_seq
  returning seq, inspection_report_seq
)
insert into public.inspection_measurement_run_items (
  measurement_run_seq, source_report_item_seq, sort_order, nominal_dimension, tolerance_min, tolerance_max,
  marker_x_ratio, marker_y_ratio, result_1, result_2, result_3, result_4, result_5, result_6,
  result_7, result_8, result_9, result_10, note, created_at, created_by, updated_at, updated_by
)
select ir.seq, i.seq, i.sort_order, i.nominal_dimension, i.tolerance_min, i.tolerance_max,
  i.marker_x_ratio, i.marker_y_ratio, m.result_1, m.result_2, m.result_3, m.result_4, m.result_5,
  m.result_6, m.result_7, m.result_8, m.result_9, m.result_10, m.note,
  m.updated_at, m.updated_by, m.updated_at, m.updated_by
from inserted_runs ir
join public.inspection_report_items i on i.inspection_report_seq = ir.inspection_report_seq
join public.inspection_report_measurements m on m.inspection_report_item_seq = i.seq;
