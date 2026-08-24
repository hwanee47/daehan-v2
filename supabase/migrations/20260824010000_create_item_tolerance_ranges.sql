create extension if not exists btree_gist
with schema extensions;

create table public.item_tolerance_ranges (
  seq bigint generated always as identity primary key,
  item_seq bigint not null references public.items (seq) on delete restrict,
  nominal_min numeric(12, 4) not null,
  nominal_max numeric(12, 4) not null,
  upper_deviation numeric(12, 4) not null,
  lower_deviation numeric(12, 4) not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint item_tolerance_ranges_nominal_min_check
    check (nominal_min >= 0),
  constraint item_tolerance_ranges_nominal_order_check
    check (nominal_max > nominal_min),
  constraint item_tolerance_ranges_deviation_order_check
    check (upper_deviation >= lower_deviation),
  constraint item_tolerance_ranges_no_overlap
    exclude using gist (
      item_seq with =,
      numrange(nominal_min, nominal_max, '(]') with &&
    )
);

comment on table public.item_tolerance_ranges is '품목별 기준 치수 범위와 상한·하한 편차';
comment on column public.item_tolerance_ranges.seq is '오차범위 내부 식별용 자동 증가 일련번호';
comment on column public.item_tolerance_ranges.item_seq is '품목마스터 items.seq';
comment on column public.item_tolerance_ranges.nominal_min is '기준 치수 범위의 제외 하한값(mm)';
comment on column public.item_tolerance_ranges.nominal_max is '기준 치수 범위의 포함 상한값(mm)';
comment on column public.item_tolerance_ranges.upper_deviation is '기준 치수에 더하는 상한 편차(mm)';
comment on column public.item_tolerance_ranges.lower_deviation is '기준 치수에 더하는 하한 편차(mm)';
comment on column public.item_tolerance_ranges.note is '비고';
comment on column public.item_tolerance_ranges.created_at is '생성 일시';
comment on column public.item_tolerance_ranges.created_by is '생성한 인증 사용자 ID';
comment on column public.item_tolerance_ranges.updated_at is '마지막 수정 일시';
comment on column public.item_tolerance_ranges.updated_by is '마지막으로 수정한 인증 사용자 ID';

create index item_tolerance_ranges_item_range_idx
on public.item_tolerance_ranges (item_seq, nominal_min);

create trigger item_tolerance_ranges_set_audit_fields
before insert or update on public.item_tolerance_ranges
for each row execute function public.set_audit_fields();

alter table public.item_tolerance_ranges enable row level security;

create policy "item_tolerance_ranges_select_authenticated"
on public.item_tolerance_ranges
for select
to authenticated
using (true);

create policy "item_tolerance_ranges_insert_admin"
on public.item_tolerance_ranges
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role = 'admin'
  )
);

create policy "item_tolerance_ranges_update_admin"
on public.item_tolerance_ranges
for update
to authenticated
using (
  exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role = 'admin'
  )
);

create policy "item_tolerance_ranges_delete_admin"
on public.item_tolerance_ranges
for delete
to authenticated
using (
  exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role = 'admin'
  )
);

revoke all on table public.item_tolerance_ranges from anon, authenticated;

grant select on table public.item_tolerance_ranges to authenticated;
grant insert (
  item_seq,
  nominal_min,
  nominal_max,
  upper_deviation,
  lower_deviation,
  note
)
on public.item_tolerance_ranges to authenticated;
grant update (
  item_seq,
  nominal_min,
  nominal_max,
  upper_deviation,
  lower_deviation,
  note
)
on public.item_tolerance_ranges to authenticated;
grant delete on table public.item_tolerance_ranges to authenticated;

grant usage, select
on sequence public.item_tolerance_ranges_seq_seq
to authenticated;
