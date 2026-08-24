create table public.items (
  seq bigint generated always as identity primary key,
  item_code text not null unique,
  item_name text not null,
  model_name text,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint items_item_code_not_blank check (btrim(item_code) <> ''),
  constraint items_item_name_not_blank check (btrim(item_name) <> '')
);

comment on table public.items is '품목 기본 정보를 관리하는 품목마스터';
comment on column public.items.seq is '품목 내부 식별용 자동 증가 일련번호';
comment on column public.items.item_code is '품목을 식별하는 고유 코드';
comment on column public.items.item_name is '품목명';
comment on column public.items.model_name is '품목 모델명';
comment on column public.items.note is '품목 비고';
comment on column public.items.created_at is '생성 일시';
comment on column public.items.created_by is '생성한 인증 사용자 ID';
comment on column public.items.updated_at is '마지막 수정 일시';
comment on column public.items.updated_by is '마지막으로 수정한 인증 사용자 ID';

create trigger items_set_audit_fields
before insert or update on public.items
for each row execute function public.set_audit_fields();

create table public.item_details (
  seq bigint generated always as identity primary key,
  item_seq bigint not null references public.items (seq) on delete restrict,
  item_detail_code text not null,
  item_detail_name text not null,
  material text,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint item_details_item_detail_code_not_blank check (btrim(item_detail_code) <> ''),
  constraint item_details_item_detail_name_not_blank check (btrim(item_detail_name) <> ''),
  constraint item_details_item_code_unique unique (item_seq, item_detail_code)
);

comment on table public.item_details is '품목마스터에 속한 품목상세 정보';
comment on column public.item_details.seq is '품목상세 내부 식별용 자동 증가 일련번호';
comment on column public.item_details.item_seq is '상위 품목마스터 seq';
comment on column public.item_details.item_detail_code is '품목 안에서 유일한 품목상세코드';
comment on column public.item_details.item_detail_name is '품목상세명';
comment on column public.item_details.material is '품목상세 소재';
comment on column public.item_details.note is '품목상세 비고';
comment on column public.item_details.created_at is '생성 일시';
comment on column public.item_details.created_by is '생성한 인증 사용자 ID';
comment on column public.item_details.updated_at is '마지막 수정 일시';
comment on column public.item_details.updated_by is '마지막으로 수정한 인증 사용자 ID';

create index item_details_item_seq_idx
on public.item_details (item_seq, seq);

create trigger item_details_set_audit_fields
before insert or update on public.item_details
for each row execute function public.set_audit_fields();

alter table public.items enable row level security;
alter table public.item_details enable row level security;

create policy "items_select_authenticated"
on public.items
for select
to authenticated
using (true);

create policy "items_insert_admin"
on public.items
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

create policy "items_update_admin"
on public.items
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

create policy "items_delete_admin"
on public.items
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

create policy "item_details_select_authenticated"
on public.item_details
for select
to authenticated
using (true);

create policy "item_details_insert_admin"
on public.item_details
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

create policy "item_details_update_admin"
on public.item_details
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

create policy "item_details_delete_admin"
on public.item_details
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

revoke all on table public.items from anon, authenticated;
revoke all on table public.item_details from anon, authenticated;

grant select on table public.items to authenticated;
grant insert (item_code, item_name, model_name, note)
on public.items to authenticated;
grant update (item_code, item_name, model_name, note)
on public.items to authenticated;
grant delete on table public.items to authenticated;

grant select on table public.item_details to authenticated;
grant insert (item_seq, item_detail_code, item_detail_name, material, note)
on public.item_details to authenticated;
grant update (item_seq, item_detail_code, item_detail_name, material, note)
on public.item_details to authenticated;
grant delete on table public.item_details to authenticated;

grant usage, select on sequence public.items_seq_seq to authenticated;
grant usage, select on sequence public.item_details_seq_seq to authenticated;
