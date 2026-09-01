create or replace function public.soft_delete_inspection_report(p_seq bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.inspection_reports
  set is_deleted = true
  where seq = p_seq
    and is_deleted = false;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.soft_delete_inspection_report(bigint) from public, anon;
grant execute on function public.soft_delete_inspection_report(bigint) to authenticated;

comment on function public.soft_delete_inspection_report(bigint) is
  '로그인 사용자가 검사성적서의 일반 수정 권한을 얻지 않고 소프트 삭제만 수행한다';
