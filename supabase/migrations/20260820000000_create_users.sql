create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  seq bigint generated always as identity not null unique,
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint users_email_not_blank check (btrim(email) <> ''),
  constraint users_name_not_blank check (btrim(name) <> '')
);

comment on table public.users is 'Supabase Auth 사용자에게 연결된 공개 프로필';
comment on column public.users.id is 'auth.users.id와 연결되는 인증 사용자 ID';
comment on column public.users.seq is '화면 표시 및 정렬용 자동 증가 번호';
comment on column public.users.email is 'Supabase Auth에서 동기화한 이메일';
comment on column public.users.name is '사용자 표시 이름';
comment on column public.users.created_at is '생성 일시';
comment on column public.users.created_by is '생성한 인증 사용자 ID';
comment on column public.users.updated_at is '마지막 수정 일시';
comment on column public.users.updated_by is '마지막으로 수정한 인증 사용자 ID';

create or replace function public.set_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;

  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by, new.created_by);
  return new;
end;
$$;

create trigger users_set_audit_fields
before insert or update on public.users
for each row execute function public.set_audit_fields();

create or replace function public.handle_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.users (id, email, name, created_by, updated_by)
    values (
      new.id,
      new.email,
      coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
      new.id,
      new.id
    );
  elsif new.email is distinct from old.email then
    update public.users
    set email = new.email,
        updated_by = new.id
    where id = new.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_changed
after insert or update of email on auth.users
for each row execute function public.handle_auth_user_change();

alter table public.users enable row level security;

create policy "users_select_own_profile"
on public.users
for select
to authenticated
using ((select auth.uid()) = id);

create policy "users_update_own_profile"
on public.users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on table public.users from anon, authenticated;
grant select on table public.users to authenticated;
grant update (name) on table public.users to authenticated;
