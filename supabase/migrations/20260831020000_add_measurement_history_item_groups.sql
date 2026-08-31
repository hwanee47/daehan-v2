alter table public.inspection_reports
  add column item_seq bigint references public.items (seq) on delete restrict;

update public.inspection_reports as report
set item_seq = detail.item_seq
from public.item_details as detail
where detail.seq = report.item_detail_seq;

alter table public.inspection_reports
  alter column item_seq set not null;

comment on column public.inspection_reports.item_seq is '검사 대상 품목마스터 seq';

alter table public.inspection_measurement_runs
  add column item_seq bigint references public.items (seq) on delete restrict;

update public.inspection_measurement_runs as run
set item_seq = detail.item_seq
from public.item_details as detail
where detail.seq = run.item_detail_seq;

alter table public.inspection_measurement_runs
  alter column item_seq set not null;

comment on column public.inspection_measurement_runs.item_seq is '이력 생성 당시 품목마스터 seq';

create index inspection_measurement_runs_item_created_idx
on public.inspection_measurement_runs (item_seq, created_at desc, seq desc);

create index inspection_measurement_runs_item_detail_created_idx
on public.inspection_measurement_runs (item_seq, item_detail_seq, created_at desc, seq desc);

create or replace function public.set_inspection_report_item_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select
    detail.item_seq,
    detail.item_detail_code,
    detail.item_detail_name,
    detail.material,
    detail.image_path,
    item.item_code,
    item.item_name,
    item.model_name
  into
    new.item_seq,
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

create or replace function public.set_inspection_measurement_run_report_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select
    report.model_name, report.item_seq, report.item_detail_seq, report.item_detail_code,
    report.item_detail_name, report.item_code, report.item_name, report.customer_name,
    report.supplier_name, report.delivery_quantity, report.sample_count,
    report.product_type_code_seq, report.product_type_code, report.product_type_name,
    report.material, report.hardness, report.heat_treatment, report.image_path
  into
    new.model_name, new.item_seq, new.item_detail_seq, new.item_detail_code,
    new.item_detail_name, new.item_code, new.item_name, new.customer_name,
    new.supplier_name, new.delivery_quantity, new.sample_count,
    new.product_type_code_seq, new.product_type_code, new.product_type_name,
    new.material, new.hardness, new.heat_treatment, new.image_path
  from public.inspection_reports as report
  where report.seq = new.inspection_report_seq;

  if not found then
    raise exception using errcode = '23503', message = 'inspection measurement report does not exist';
  end if;
  return new;
end;
$$;

create or replace function public.search_inspection_measurement_item_groups(
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_search_field text,
  p_keyword text,
  p_offset integer,
  p_limit integer
)
returns table (
  item_seq bigint,
  item_code text,
  item_name text,
  model_name text,
  item_detail_count bigint,
  run_count bigint,
  latest_created_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered as (
    select run.*
    from public.inspection_measurement_runs as run
    where (p_date_from is null or run.created_at >= p_date_from)
      and (p_date_to is null or run.created_at < p_date_to)
      and (
        nullif(btrim(p_keyword), '') is null
        or p_search_field = 'model' and run.model_name ilike '%' || p_keyword || '%'
        or p_search_field = 'drawing' and run.item_detail_code ilike '%' || p_keyword || '%'
        or p_search_field = 'itemName' and run.item_name ilike '%' || p_keyword || '%'
        or p_search_field = 'customer' and run.customer_name ilike '%' || p_keyword || '%'
      )
  ), grouped as (
    select
      filtered.item_seq,
      count(distinct filtered.item_detail_seq) as item_detail_count,
      count(*) as run_count,
      max(filtered.created_at) as latest_created_at
    from filtered
    group by filtered.item_seq
  )
  select
    grouped.item_seq,
    latest.item_code,
    latest.item_name,
    latest.model_name,
    grouped.item_detail_count,
    grouped.run_count,
    grouped.latest_created_at,
    count(*) over () as total_count
  from grouped
  join lateral (
    select filtered.item_code, filtered.item_name, filtered.model_name
    from filtered
    where filtered.item_seq = grouped.item_seq
    order by filtered.created_at desc, filtered.seq desc
    limit 1
  ) as latest on true
  order by grouped.latest_created_at desc, grouped.item_seq desc
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.search_inspection_measurement_item_groups(timestamptz, timestamptz, text, text, integer, integer) from public, anon;
grant execute on function public.search_inspection_measurement_item_groups(timestamptz, timestamptz, text, text, integer, integer) to authenticated;
