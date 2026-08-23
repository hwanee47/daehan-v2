create table public.code_groups (
  seq bigint generated always as identity primary key,
  group_code text not null unique,
  group_name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint code_groups_group_code_not_blank check (btrim(group_code) <> ''),
  constraint code_groups_group_name_not_blank check (btrim(group_name) <> ''),
  constraint code_groups_sort_order_nonnegative check (sort_order >= 0)
);

comment on table public.code_groups is '애플리케이션 공통 코드 그룹';
comment on column public.code_groups.seq is '코드 그룹 내부 식별용 자동 증가 번호';
comment on column public.code_groups.group_code is '환경과 이름 변경에 영향받지 않는 코드 그룹 식별자';
comment on column public.code_groups.group_name is '화면에 표시할 코드 그룹명';
comment on column public.code_groups.description is '코드 그룹 설명';
comment on column public.code_groups.sort_order is '코드 그룹 표시 순서';
comment on column public.code_groups.is_active is '코드 그룹 사용 여부';
comment on column public.code_groups.created_at is '생성 일시';
comment on column public.code_groups.created_by is '생성한 인증 사용자 ID';
comment on column public.code_groups.updated_at is '마지막 수정 일시';
comment on column public.code_groups.updated_by is '마지막으로 수정한 인증 사용자 ID';

create trigger code_groups_set_audit_fields
before insert or update on public.code_groups
for each row execute function public.set_audit_fields();

create table public.code_details (
  seq bigint generated always as identity primary key,
  code_group_seq bigint not null references public.code_groups (seq) on delete restrict,
  code text not null,
  code_name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint code_details_code_not_blank check (btrim(code) <> ''),
  constraint code_details_code_name_not_blank check (btrim(code_name) <> ''),
  constraint code_details_sort_order_nonnegative check (sort_order >= 0),
  constraint code_details_group_code_unique unique (code_group_seq, code)
);

comment on table public.code_details is '코드 그룹에 속한 공통 상세 코드';
comment on column public.code_details.seq is '상세 코드 내부 식별용 자동 증가 번호';
comment on column public.code_details.code_group_seq is '상위 코드 그룹 seq';
comment on column public.code_details.code is '코드 그룹 안에서 유일한 상세 코드';
comment on column public.code_details.code_name is '화면에 표시할 코드명';
comment on column public.code_details.description is '상세 코드 설명';
comment on column public.code_details.sort_order is '상세 코드 표시 순서';
comment on column public.code_details.is_active is '상세 코드 사용 여부';
comment on column public.code_details.created_at is '생성 일시';
comment on column public.code_details.created_by is '생성한 인증 사용자 ID';
comment on column public.code_details.updated_at is '마지막 수정 일시';
comment on column public.code_details.updated_by is '마지막으로 수정한 인증 사용자 ID';

create index code_details_group_sort_idx
on public.code_details (code_group_seq, sort_order, seq);

create trigger code_details_set_audit_fields
before insert or update on public.code_details
for each row execute function public.set_audit_fields();

alter table public.code_groups enable row level security;
alter table public.code_details enable row level security;

create policy "code_groups_select_authenticated"
on public.code_groups
for select
to authenticated
using (true);

create policy "code_groups_insert_admin"
on public.code_groups
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

create policy "code_groups_update_admin"
on public.code_groups
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

create policy "code_groups_delete_admin"
on public.code_groups
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

create policy "code_details_select_authenticated"
on public.code_details
for select
to authenticated
using (true);

create policy "code_details_insert_admin"
on public.code_details
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

create policy "code_details_update_admin"
on public.code_details
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

create policy "code_details_delete_admin"
on public.code_details
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

revoke all on table public.code_groups from anon, authenticated;
revoke all on table public.code_details from anon, authenticated;

grant select on table public.code_groups to authenticated;
grant insert (group_code, group_name, description, sort_order, is_active)
on public.code_groups to authenticated;
grant update (group_code, group_name, description, sort_order, is_active)
on public.code_groups to authenticated;
grant delete on table public.code_groups to authenticated;

grant select on table public.code_details to authenticated;
grant insert (code_group_seq, code, code_name, description, sort_order, is_active)
on public.code_details to authenticated;
grant update (code_group_seq, code, code_name, description, sort_order, is_active)
on public.code_details to authenticated;
grant delete on table public.code_details to authenticated;

grant usage, select on sequence public.code_groups_seq_seq to authenticated;
grant usage, select on sequence public.code_details_seq_seq to authenticated;
