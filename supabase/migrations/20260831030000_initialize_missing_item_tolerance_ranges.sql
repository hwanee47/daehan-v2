do $$
declare
  source_item_seq bigint;
  source_range_count integer;
  target_item_seqs bigint[];
  target_item_count integer;
  inserted_range_count integer;
  mismatched_item_count integer;
begin
  select seq
  into source_item_seq
  from public.items
  where item_code = 'B302B-12200';

  if source_item_seq is null then
    raise exception 'Source item B302B-12200 does not exist';
  end if;

  select count(*)
  into source_range_count
  from public.item_tolerance_ranges
  where item_seq = source_item_seq;

  if source_range_count = 0 then
    raise exception 'Source item B302B-12200 has no tolerance ranges';
  end if;

  select coalesce(array_agg(item.seq order by item.seq), array[]::bigint[])
  into target_item_seqs
  from public.items as item
  where item.seq <> source_item_seq
    and not exists (
      select 1
      from public.item_tolerance_ranges as existing
      where existing.item_seq = item.seq
    );

  target_item_count := cardinality(target_item_seqs);

  if target_item_count = 0 then
    raise notice 'No items without tolerance ranges; nothing to initialize';
    return;
  end if;

  insert into public.item_tolerance_ranges (
    item_seq,
    nominal_min,
    nominal_max,
    upper_deviation,
    lower_deviation,
    note
  )
  select
    target_item_seq,
    source.nominal_min,
    source.nominal_max,
    source.upper_deviation,
    source.lower_deviation,
    source.note
  from unnest(target_item_seqs) as target(target_item_seq)
  cross join public.item_tolerance_ranges as source
  where source.item_seq = source_item_seq;

  get diagnostics inserted_range_count = row_count;

  if inserted_range_count <> target_item_count * source_range_count then
    raise exception 'Expected % initialized tolerance ranges, inserted %',
      target_item_count * source_range_count,
      inserted_range_count;
  end if;

  select count(*)
  into mismatched_item_count
  from unnest(target_item_seqs) as target(target_item_seq)
  where exists (
    (
      select nominal_min, nominal_max, upper_deviation, lower_deviation, note
      from public.item_tolerance_ranges
      where item_seq = source_item_seq
      except
      select nominal_min, nominal_max, upper_deviation, lower_deviation, note
      from public.item_tolerance_ranges
      where item_seq = target.target_item_seq
    )
    union all
    (
      select nominal_min, nominal_max, upper_deviation, lower_deviation, note
      from public.item_tolerance_ranges
      where item_seq = target.target_item_seq
      except
      select nominal_min, nominal_max, upper_deviation, lower_deviation, note
      from public.item_tolerance_ranges
      where item_seq = source_item_seq
    )
  );

  if mismatched_item_count <> 0 then
    raise exception '% initialized items do not match source tolerance ranges',
      mismatched_item_count;
  end if;

  raise notice 'Initialized % tolerance ranges for % items',
    inserted_range_count,
    target_item_count;
end
$$;
