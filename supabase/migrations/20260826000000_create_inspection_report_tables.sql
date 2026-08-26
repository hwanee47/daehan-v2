insert into public.code_groups (group_code, group_name, description, sort_order)
values
  ('PRODUCT_TYPE', '제품구분', '검사성적서 제품구분 코드', 10),
  ('FINAL_JUDGMENT_STATUS', '최종판정상태', '검사성적서 최종판정상태 코드', 20)
on conflict (group_code) do nothing;

create table public.inspection_reports (
  seq bigint generated always as identity primary key,
  model_name text not null,
  item_detail_seq bigint not null references public.item_details (seq) on delete restrict,
  item_detail_code text not null,
  customer_name text not null,
  supplier_name text not null,
  delivery_quantity integer not null,
  sample_count integer not null,
  delivery_date date not null,
  product_type_code_seq bigint not null references public.code_details (seq) on delete restrict,
  hardness text,
  heat_treatment text,
  special_notes text,
  final_judgment_code_seq bigint references public.code_details (seq) on delete restrict,
  inspector_name text not null,
  inspection_date date not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint inspection_reports_model_name_not_blank check (btrim(model_name) <> ''),
  constraint inspection_reports_item_detail_code_not_blank check (btrim(item_detail_code) <> ''),
  constraint inspection_reports_customer_name_not_blank check (btrim(customer_name) <> ''),
  constraint inspection_reports_supplier_name_not_blank check (btrim(supplier_name) <> ''),
  constraint inspection_reports_delivery_quantity_positive check (delivery_quantity > 0),
  constraint inspection_reports_sample_count_range check (
    sample_count between 1 and 10
    and sample_count <= delivery_quantity
  ),
  constraint inspection_reports_inspector_name_not_blank check (btrim(inspector_name) <> ''),
  constraint inspection_reports_status_allowed check (status in ('draft', 'completed', 'cancelled'))
);

comment on table public.inspection_reports is '검사성적서 기본 정보와 판정 상태를 관리하는 마스터';
comment on column public.inspection_reports.seq is '검사성적서 내부 식별용 자동 증가 일련번호';
comment on column public.inspection_reports.model_name is '발행 당시 기종 스냅샷';
comment on column public.inspection_reports.item_detail_seq is '검사 대상 품목상세 seq';
comment on column public.inspection_reports.item_detail_code is '발행 당시 품목상세코드 스냅샷';
comment on column public.inspection_reports.customer_name is '고객명';
comment on column public.inspection_reports.supplier_name is '업체명';
comment on column public.inspection_reports.delivery_quantity is '납품수량';
comment on column public.inspection_reports.sample_count is '검사 시료수, 1 이상 10 이하';
comment on column public.inspection_reports.delivery_date is '납품일자';
comment on column public.inspection_reports.product_type_code_seq is 'PRODUCT_TYPE 그룹의 제품구분 코드 seq';
comment on column public.inspection_reports.hardness is '경도 표현값';
comment on column public.inspection_reports.heat_treatment is '열처리 정보';
comment on column public.inspection_reports.special_notes is '특기사항';
comment on column public.inspection_reports.final_judgment_code_seq is 'FINAL_JUDGMENT_STATUS 그룹의 최종판정상태 코드 seq';
comment on column public.inspection_reports.inspector_name is '발행 당시 검사자 이름 스냅샷';
comment on column public.inspection_reports.inspection_date is '검사일자';
comment on column public.inspection_reports.status is '업무 상태: draft, completed, cancelled';
comment on column public.inspection_reports.created_at is '생성 일시';
comment on column public.inspection_reports.created_by is '생성한 인증 사용자 ID';
comment on column public.inspection_reports.updated_at is '마지막 수정 일시';
comment on column public.inspection_reports.updated_by is '마지막으로 수정한 인증 사용자 ID';

create or replace function public.set_inspection_report_item_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_item_detail_code text;
  selected_model_name text;
begin
  select item_details.item_detail_code, items.model_name
  into selected_item_detail_code, selected_model_name
  from public.item_details
  join public.items on items.seq = item_details.item_seq
  where item_details.seq = new.item_detail_seq;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'inspection report item detail does not exist';
  end if;

  if selected_model_name is null or btrim(selected_model_name) = '' then
    raise exception using
      errcode = '23514',
      message = 'inspection report item model name is required';
  end if;

  new.item_detail_code := selected_item_detail_code;
  new.model_name := selected_model_name;
  return new;
end;
$$;

create or replace function public.validate_inspection_report_codes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.code_details
    join public.code_groups on code_groups.seq = code_details.code_group_seq
    where code_details.seq = new.product_type_code_seq
      and code_groups.group_code = 'PRODUCT_TYPE'
  ) then
    raise exception using
      errcode = '23514',
      message = 'inspection report product type code is invalid';
  end if;

  if new.final_judgment_code_seq is not null and not exists (
    select 1
    from public.code_details
    join public.code_groups on code_groups.seq = code_details.code_group_seq
    where code_details.seq = new.final_judgment_code_seq
      and code_groups.group_code = 'FINAL_JUDGMENT_STATUS'
  ) then
    raise exception using
      errcode = '23514',
      message = 'inspection report final judgment code is invalid';
  end if;

  return new;
end;
$$;

create trigger inspection_reports_set_item_snapshot
before insert or update of item_detail_seq on public.inspection_reports
for each row execute function public.set_inspection_report_item_snapshot();

create trigger inspection_reports_validate_codes
before insert or update of product_type_code_seq, final_judgment_code_seq on public.inspection_reports
for each row execute function public.validate_inspection_report_codes();

create trigger inspection_reports_set_audit_fields
before insert or update on public.inspection_reports
for each row execute function public.set_audit_fields();

create index inspection_reports_inspection_date_idx
on public.inspection_reports (inspection_date desc, seq desc);

create index inspection_reports_item_detail_idx
on public.inspection_reports (item_detail_seq, inspection_date desc, seq desc);

create index inspection_reports_status_idx
on public.inspection_reports (status, inspection_date desc, seq desc);

create table public.inspection_report_details (
  seq bigint generated always as identity primary key,
  sort_order integer not null,
  inspection_report_seq bigint not null references public.inspection_reports (seq) on delete cascade,
  nominal_dimension numeric(14, 4) not null,
  tolerance_min numeric(14, 4) not null,
  tolerance_max numeric(14, 4) not null,
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
  constraint inspection_report_details_sort_order_nonnegative check (sort_order >= 0),
  constraint inspection_report_details_tolerance_order check (tolerance_min <= tolerance_max),
  constraint inspection_report_details_report_sort_unique unique (inspection_report_seq, sort_order)
);

comment on table public.inspection_report_details is '검사성적서의 항목별 기준치수, 공차와 시료 측정 결과';
comment on column public.inspection_report_details.seq is '검사성적서 디테일 내부 식별용 자동 증가 일련번호';
comment on column public.inspection_report_details.sort_order is '성적서 안에서의 표시 순서';
comment on column public.inspection_report_details.inspection_report_seq is '상위 검사성적서 마스터 seq';
comment on column public.inspection_report_details.nominal_dimension is '기준치수';
comment on column public.inspection_report_details.tolerance_min is '최소 허용 공차';
comment on column public.inspection_report_details.tolerance_max is '최대 허용 공차';
comment on column public.inspection_report_details.result_1 is '시료 1 측정 결과';
comment on column public.inspection_report_details.result_2 is '시료 2 측정 결과';
comment on column public.inspection_report_details.result_3 is '시료 3 측정 결과';
comment on column public.inspection_report_details.result_4 is '시료 4 측정 결과';
comment on column public.inspection_report_details.result_5 is '시료 5 측정 결과';
comment on column public.inspection_report_details.result_6 is '시료 6 측정 결과';
comment on column public.inspection_report_details.result_7 is '시료 7 측정 결과';
comment on column public.inspection_report_details.result_8 is '시료 8 측정 결과';
comment on column public.inspection_report_details.result_9 is '시료 9 측정 결과';
comment on column public.inspection_report_details.result_10 is '시료 10 측정 결과';
comment on column public.inspection_report_details.note is '비고';
comment on column public.inspection_report_details.created_at is '생성 일시';
comment on column public.inspection_report_details.created_by is '생성한 인증 사용자 ID';
comment on column public.inspection_report_details.updated_at is '마지막 수정 일시';
comment on column public.inspection_report_details.updated_by is '마지막으로 수정한 인증 사용자 ID';

create index inspection_report_details_report_idx
on public.inspection_report_details (inspection_report_seq, sort_order, seq);

create trigger inspection_report_details_set_audit_fields
before insert or update on public.inspection_report_details
for each row execute function public.set_audit_fields();

alter table public.inspection_reports enable row level security;
alter table public.inspection_report_details enable row level security;

create policy "inspection_reports_select_authenticated"
on public.inspection_reports
for select
to authenticated
using (true);

create policy "inspection_reports_insert_authenticated"
on public.inspection_reports
for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "inspection_reports_update_owner_or_admin"
on public.inspection_reports
for update
to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.users
    where id = (select auth.uid()) and role = 'admin'
  )
)
with check (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.users
    where id = (select auth.uid()) and role = 'admin'
  )
);

create policy "inspection_reports_delete_owner_or_admin"
on public.inspection_reports
for delete
to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.users
    where id = (select auth.uid()) and role = 'admin'
  )
);

create policy "inspection_report_details_select_authenticated"
on public.inspection_report_details
for select
to authenticated
using (true);

create policy "inspection_report_details_insert_owner_or_admin"
on public.inspection_report_details
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.inspection_reports
    where seq = inspection_report_seq
      and (
        created_by = (select auth.uid())
        or exists (
          select 1 from public.users
          where id = (select auth.uid()) and role = 'admin'
        )
      )
  )
);

create policy "inspection_report_details_update_owner_or_admin"
on public.inspection_report_details
for update
to authenticated
using (
  exists (
    select 1 from public.inspection_reports
    where seq = inspection_report_seq
      and (
        created_by = (select auth.uid())
        or exists (
          select 1 from public.users
          where id = (select auth.uid()) and role = 'admin'
        )
      )
  )
)
with check (
  exists (
    select 1 from public.inspection_reports
    where seq = inspection_report_seq
      and (
        created_by = (select auth.uid())
        or exists (
          select 1 from public.users
          where id = (select auth.uid()) and role = 'admin'
        )
      )
  )
);

create policy "inspection_report_details_delete_owner_or_admin"
on public.inspection_report_details
for delete
to authenticated
using (
  exists (
    select 1 from public.inspection_reports
    where seq = inspection_report_seq
      and (
        created_by = (select auth.uid())
        or exists (
          select 1 from public.users
          where id = (select auth.uid()) and role = 'admin'
        )
      )
  )
);

revoke all on table public.inspection_reports from anon, authenticated;
revoke all on table public.inspection_report_details from anon, authenticated;

grant select on table public.inspection_reports to authenticated;
grant insert (
  item_detail_seq,
  customer_name,
  supplier_name,
  delivery_quantity,
  sample_count,
  delivery_date,
  product_type_code_seq,
  hardness,
  heat_treatment,
  special_notes,
  final_judgment_code_seq,
  inspector_name,
  inspection_date,
  status
) on public.inspection_reports to authenticated;
grant update (
  item_detail_seq,
  customer_name,
  supplier_name,
  delivery_quantity,
  sample_count,
  delivery_date,
  product_type_code_seq,
  hardness,
  heat_treatment,
  special_notes,
  final_judgment_code_seq,
  inspector_name,
  inspection_date,
  status
) on public.inspection_reports to authenticated;
grant delete on table public.inspection_reports to authenticated;

grant select on table public.inspection_report_details to authenticated;
grant insert (
  sort_order,
  inspection_report_seq,
  nominal_dimension,
  tolerance_min,
  tolerance_max,
  result_1,
  result_2,
  result_3,
  result_4,
  result_5,
  result_6,
  result_7,
  result_8,
  result_9,
  result_10,
  note
) on public.inspection_report_details to authenticated;
grant update (
  sort_order,
  inspection_report_seq,
  nominal_dimension,
  tolerance_min,
  tolerance_max,
  result_1,
  result_2,
  result_3,
  result_4,
  result_5,
  result_6,
  result_7,
  result_8,
  result_9,
  result_10,
  note
) on public.inspection_report_details to authenticated;
grant delete on table public.inspection_report_details to authenticated;

grant usage, select on sequence public.inspection_reports_seq_seq to authenticated;
grant usage, select on sequence public.inspection_report_details_seq_seq to authenticated;
