alter table public.inspection_report_details
rename to inspection_report_items;

alter sequence public.inspection_report_details_seq_seq
rename to inspection_report_items_seq_seq;

alter table public.inspection_report_items
rename constraint inspection_report_details_pkey to inspection_report_items_pkey;

alter table public.inspection_report_items
rename constraint inspection_report_details_inspection_report_seq_fkey
to inspection_report_items_inspection_report_seq_fkey;

alter table public.inspection_report_items
rename constraint inspection_report_details_created_by_fkey
to inspection_report_items_created_by_fkey;

alter table public.inspection_report_items
rename constraint inspection_report_details_updated_by_fkey
to inspection_report_items_updated_by_fkey;

alter table public.inspection_report_items
rename constraint inspection_report_details_sort_order_nonnegative
to inspection_report_items_sort_order_nonnegative;

alter table public.inspection_report_items
rename constraint inspection_report_details_tolerance_order
to inspection_report_items_tolerance_order;

alter table public.inspection_report_items
rename constraint inspection_report_details_report_sort_unique
to inspection_report_items_report_sort_unique;

alter index public.inspection_report_details_report_idx
rename to inspection_report_items_report_idx;

alter trigger inspection_report_details_set_audit_fields
on public.inspection_report_items
rename to inspection_report_items_set_audit_fields;

alter policy "inspection_report_details_select_authenticated"
on public.inspection_report_items
rename to "inspection_report_items_select_authenticated";

alter policy "inspection_report_details_insert_owner_or_admin"
on public.inspection_report_items
rename to "inspection_report_items_insert_owner_or_admin";

alter policy "inspection_report_details_update_owner_or_admin"
on public.inspection_report_items
rename to "inspection_report_items_update_owner_or_admin";

alter policy "inspection_report_details_delete_owner_or_admin"
on public.inspection_report_items
rename to "inspection_report_items_delete_owner_or_admin";

alter table public.inspection_report_items
add constraint inspection_report_items_report_seq_unique
unique (inspection_report_seq, seq);

create table public.inspection_report_measurements (
  seq bigint generated always as identity primary key,
  inspection_report_seq bigint not null references public.inspection_reports (seq) on delete cascade,
  inspection_report_item_seq bigint not null,
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
  constraint inspection_report_measurements_report_item_fkey
    foreign key (inspection_report_seq, inspection_report_item_seq)
    references public.inspection_report_items (inspection_report_seq, seq)
    on delete cascade,
  constraint inspection_report_measurements_item_unique
    unique (inspection_report_item_seq)
);

comment on table public.inspection_report_measurements is '검사성적서 검사항목별 시료 측정결과';
comment on column public.inspection_report_measurements.seq is '측정결과 내부 식별용 자동 증가 일련번호';
comment on column public.inspection_report_measurements.inspection_report_seq is '상위 검사성적서 마스터 seq';
comment on column public.inspection_report_measurements.inspection_report_item_seq is '상위 검사성적서 검사항목 seq';
comment on column public.inspection_report_measurements.result_1 is '시료 1 측정 결과';
comment on column public.inspection_report_measurements.result_2 is '시료 2 측정 결과';
comment on column public.inspection_report_measurements.result_3 is '시료 3 측정 결과';
comment on column public.inspection_report_measurements.result_4 is '시료 4 측정 결과';
comment on column public.inspection_report_measurements.result_5 is '시료 5 측정 결과';
comment on column public.inspection_report_measurements.result_6 is '시료 6 측정 결과';
comment on column public.inspection_report_measurements.result_7 is '시료 7 측정 결과';
comment on column public.inspection_report_measurements.result_8 is '시료 8 측정 결과';
comment on column public.inspection_report_measurements.result_9 is '시료 9 측정 결과';
comment on column public.inspection_report_measurements.result_10 is '시료 10 측정 결과';
comment on column public.inspection_report_measurements.note is '비고';
comment on column public.inspection_report_measurements.created_at is '생성 일시';
comment on column public.inspection_report_measurements.created_by is '생성한 인증 사용자 ID';
comment on column public.inspection_report_measurements.updated_at is '마지막 수정 일시';
comment on column public.inspection_report_measurements.updated_by is '마지막으로 수정한 인증 사용자 ID';

insert into public.inspection_report_measurements (
  inspection_report_seq,
  inspection_report_item_seq,
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
  note,
  created_at,
  created_by,
  updated_at,
  updated_by
)
select
  inspection_report_seq,
  seq,
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
  note,
  created_at,
  created_by,
  updated_at,
  updated_by
from public.inspection_report_items;

do $$
begin
  if (select count(*) from public.inspection_report_items)
    <> (select count(*) from public.inspection_report_measurements) then
    raise exception 'inspection report measurement migration row count mismatch';
  end if;
end;
$$;

alter table public.inspection_report_items
drop column result_1,
drop column result_2,
drop column result_3,
drop column result_4,
drop column result_5,
drop column result_6,
drop column result_7,
drop column result_8,
drop column result_9,
drop column result_10,
drop column note;

comment on table public.inspection_report_items is '검사성적서의 기준치수와 공차를 정의하는 검사항목';
comment on column public.inspection_report_items.seq is '검사항목 내부 식별용 자동 증가 일련번호';
comment on column public.inspection_report_items.sort_order is '성적서 안에서의 검사항목 표시 순서';
comment on column public.inspection_report_items.inspection_report_seq is '상위 검사성적서 마스터 seq';
comment on column public.inspection_report_items.nominal_dimension is '기준치수';
comment on column public.inspection_report_items.tolerance_min is '최소 허용 공차';
comment on column public.inspection_report_items.tolerance_max is '최대 허용 공차';

create trigger inspection_report_measurements_set_audit_fields
before insert or update on public.inspection_report_measurements
for each row execute function public.set_audit_fields();

alter table public.inspection_report_measurements enable row level security;

create policy "inspection_report_measurements_select_authenticated"
on public.inspection_report_measurements
for select
to authenticated
using (true);

create policy "inspection_report_measurements_insert_owner_or_admin"
on public.inspection_report_measurements
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

create policy "inspection_report_measurements_update_owner_or_admin"
on public.inspection_report_measurements
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

create policy "inspection_report_measurements_delete_owner_or_admin"
on public.inspection_report_measurements
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

revoke all on table public.inspection_report_items from anon, authenticated;

grant select on table public.inspection_report_items to authenticated;
grant insert (
  sort_order,
  inspection_report_seq,
  nominal_dimension,
  tolerance_min,
  tolerance_max
) on public.inspection_report_items to authenticated;
grant update (
  sort_order,
  inspection_report_seq,
  nominal_dimension,
  tolerance_min,
  tolerance_max
) on public.inspection_report_items to authenticated;
grant delete on table public.inspection_report_items to authenticated;

revoke all on table public.inspection_report_measurements from anon, authenticated;

grant select on table public.inspection_report_measurements to authenticated;
grant insert (
  inspection_report_seq,
  inspection_report_item_seq,
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
) on public.inspection_report_measurements to authenticated;
grant update (
  inspection_report_seq,
  inspection_report_item_seq,
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
) on public.inspection_report_measurements to authenticated;
grant delete on table public.inspection_report_measurements to authenticated;

grant usage, select on sequence public.inspection_report_items_seq_seq to authenticated;
grant usage, select on sequence public.inspection_report_measurements_seq_seq to authenticated;
