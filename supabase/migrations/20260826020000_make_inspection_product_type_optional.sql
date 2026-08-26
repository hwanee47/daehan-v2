alter table public.inspection_reports
alter column product_type_code_seq drop not null;

create or replace function public.validate_inspection_report_codes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.product_type_code_seq is not null and not exists (
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

comment on column public.inspection_reports.product_type_code_seq is
  'PRODUCT_TYPE 그룹의 선택 제품구분 코드 seq';
