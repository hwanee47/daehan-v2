alter table public.inspection_reports
  add column is_deleted boolean not null default false;

create index inspection_reports_active_created_idx
  on public.inspection_reports (created_at desc, seq desc)
  where is_deleted = false;

create or replace function public.prevent_deleted_inspection_report_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.is_deleted then
    raise exception 'deleted inspection report cannot be changed' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger inspection_reports_prevent_deleted_update
before update on public.inspection_reports
for each row execute function public.prevent_deleted_inspection_report_update();

comment on column public.inspection_reports.is_deleted is '활성 화면에서 제외하는 소프트 삭제 여부';
comment on function public.prevent_deleted_inspection_report_update() is '소프트 삭제된 검사성적서의 추가 변경과 측정 저장을 차단한다';
