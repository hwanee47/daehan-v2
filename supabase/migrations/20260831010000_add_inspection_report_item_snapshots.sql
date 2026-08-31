alter table public.inspection_reports
  add column item_code text,
  add column item_name text,
  add column item_detail_name text,
  add column material text,
  add column product_type_code text,
  add column product_type_name text,
  add column image_path text;

update public.inspection_reports as report
set
  item_code = item.item_code,
  item_name = item.item_name,
  item_detail_name = detail.item_detail_name,
  material = detail.material,
  image_path = detail.image_path,
  product_type_code = (
    select code from public.code_details where seq = report.product_type_code_seq
  ),
  product_type_name = (
    select code_name from public.code_details where seq = report.product_type_code_seq
  )
from public.item_details as detail
join public.items as item on item.seq = detail.item_seq
where detail.seq = report.item_detail_seq;

do $$
begin
  if exists (
    select 1
    from public.inspection_reports
    where item_code is null or item_name is null or item_detail_name is null
  ) then
    raise exception 'Unable to backfill inspection report item snapshots';
  end if;
end
$$;

alter table public.inspection_reports
  alter column item_code set not null,
  alter column item_name set not null,
  alter column item_detail_name set not null;

comment on column public.inspection_reports.item_code is '성적서 품목 선택 당시 품목코드 스냅샷';
comment on column public.inspection_reports.item_name is '성적서 품목 선택 당시 품명 스냅샷';
comment on column public.inspection_reports.item_detail_name is '성적서 품목 선택 당시 품목상세명 스냅샷';
comment on column public.inspection_reports.material is '성적서 품목 선택 당시 재질 스냅샷';
comment on column public.inspection_reports.product_type_code is '성적서 제품구분 선택 당시 코드 스냅샷';
comment on column public.inspection_reports.product_type_name is '성적서 제품구분 선택 당시 코드명 스냅샷';
comment on column public.inspection_reports.image_path is '성적서 품목 선택 당시 품목상세 이미지 Storage 경로';

create or replace function public.set_inspection_report_item_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select
    detail.item_detail_code,
    detail.item_detail_name,
    detail.material,
    detail.image_path,
    item.item_code,
    item.item_name,
    item.model_name
  into
    new.item_detail_code,
    new.item_detail_name,
    new.material,
    new.image_path,
    new.item_code,
    new.item_name,
    new.model_name
  from public.item_details as detail
  join public.items as item on item.seq = detail.item_seq
  where detail.seq = new.item_detail_seq;

  if not found then
    raise exception using errcode = '23503', message = 'inspection report item detail does not exist';
  end if;
  if new.model_name is null or btrim(new.model_name) = '' then
    raise exception using errcode = '23514', message = 'inspection report item model name is required';
  end if;
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
  if new.product_type_code_seq is null then
    new.product_type_code := null;
    new.product_type_name := null;
  else
    select detail.code, detail.code_name
    into new.product_type_code, new.product_type_name
    from public.code_details as detail
    join public.code_groups as code_group on code_group.seq = detail.code_group_seq
    where detail.seq = new.product_type_code_seq
      and code_group.group_code = 'U0002';
    if not found then
      raise exception using errcode = '23514', message = 'inspection report product type code is invalid';
    end if;
  end if;

  if new.final_judgment_code_seq is not null and not exists (
    select 1
    from public.code_details as detail
    join public.code_groups as code_group on code_group.seq = detail.code_group_seq
    where detail.seq = new.final_judgment_code_seq
      and code_group.group_code = 'FINAL_JUDGMENT_STATUS'
  ) then
    raise exception using errcode = '23514', message = 'inspection report final judgment code is invalid';
  end if;
  return new;
end;
$$;

alter table public.inspection_measurement_runs
  add column item_code text;

update public.inspection_measurement_runs as run
set item_code = item.item_code
from public.item_details as detail
join public.items as item on item.seq = detail.item_seq
where detail.seq = run.item_detail_seq;

do $$
begin
  if exists (select 1 from public.inspection_measurement_runs where item_code is null) then
    raise exception 'Unable to backfill inspection measurement run item codes';
  end if;
end
$$;

alter table public.inspection_measurement_runs
  alter column item_code set not null;

comment on column public.inspection_measurement_runs.item_code is '이력 생성 당시 품목코드 스냅샷';

create or replace function public.set_inspection_measurement_run_report_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select
    report.model_name,
    report.item_detail_seq,
    report.item_detail_code,
    report.item_detail_name,
    report.item_code,
    report.item_name,
    report.customer_name,
    report.supplier_name,
    report.delivery_quantity,
    report.sample_count,
    report.product_type_code_seq,
    report.product_type_code,
    report.product_type_name,
    report.material,
    report.hardness,
    report.heat_treatment,
    report.image_path
  into
    new.model_name,
    new.item_detail_seq,
    new.item_detail_code,
    new.item_detail_name,
    new.item_code,
    new.item_name,
    new.customer_name,
    new.supplier_name,
    new.delivery_quantity,
    new.sample_count,
    new.product_type_code_seq,
    new.product_type_code,
    new.product_type_name,
    new.material,
    new.hardness,
    new.heat_treatment,
    new.image_path
  from public.inspection_reports as report
  where report.seq = new.inspection_report_seq;

  if not found then
    raise exception using errcode = '23503', message = 'inspection measurement report does not exist';
  end if;
  return new;
end;
$$;

create trigger inspection_measurement_runs_set_report_snapshot
before insert on public.inspection_measurement_runs
for each row execute function public.set_inspection_measurement_run_report_snapshot();
