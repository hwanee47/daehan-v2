alter table public.users
add column role text not null default 'user';

alter table public.users
add constraint users_role_allowed
check (role in ('admin', 'user'));

comment on column public.users.role is '애플리케이션 접근 역할: admin 또는 user';
