create index inspection_measurement_runs_model_created_idx
on public.inspection_measurement_runs (model_name, created_at desc, seq desc);

create function public.search_inspection_measurement_model_groups(
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_search_field text,
  p_keyword text,
  p_offset integer,
  p_limit integer
)
returns table (
  model_name text,
  item_count bigint,
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
      filtered.model_name,
      count(distinct filtered.item_seq) as item_count,
      count(distinct filtered.item_detail_seq) as item_detail_count,
      count(*) as run_count,
      max(filtered.created_at) as latest_created_at
    from filtered
    group by filtered.model_name
  )
  select
    grouped.model_name,
    grouped.item_count,
    grouped.item_detail_count,
    grouped.run_count,
    grouped.latest_created_at,
    count(*) over () as total_count
  from grouped
  order by grouped.latest_created_at desc, grouped.model_name
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.search_inspection_measurement_model_groups(timestamptz, timestamptz, text, text, integer, integer) from public, anon;
grant execute on function public.search_inspection_measurement_model_groups(timestamptz, timestamptz, text, text, integer, integer) to authenticated;
