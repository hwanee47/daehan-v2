do $$
declare
  source_item_seq bigint;
  source_range_count integer;
  target_item_count integer;
  existing_target_range_count integer;
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

  select count(*)
  into target_item_count
  from public.items
  where seq <> source_item_seq;

  select count(*)
  into existing_target_range_count
  from public.item_tolerance_ranges
  where item_seq <> source_item_seq;

  if existing_target_range_count <> 0 then
    raise exception 'Target items already have % tolerance ranges; refusing to overwrite without a backup',
      existing_target_range_count;
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
    target.seq,
    source.nominal_min,
    source.nominal_max,
    source.upper_deviation,
    source.lower_deviation,
    source.note
  from public.items as target
  cross join public.item_tolerance_ranges as source
  where target.seq <> source_item_seq
    and source.item_seq = source_item_seq;

  get diagnostics inserted_range_count = row_count;

  if inserted_range_count <> target_item_count * source_range_count then
    raise exception 'Expected % copied tolerance ranges, inserted %',
      target_item_count * source_range_count,
      inserted_range_count;
  end if;

  select count(*)
  into mismatched_item_count
  from public.items as target
  where target.seq <> source_item_seq
    and exists (
      (
        select nominal_min, nominal_max, upper_deviation, lower_deviation, note
        from public.item_tolerance_ranges
        where item_seq = source_item_seq
        except
        select nominal_min, nominal_max, upper_deviation, lower_deviation, note
        from public.item_tolerance_ranges
        where item_seq = target.seq
      )
      union all
      (
        select nominal_min, nominal_max, upper_deviation, lower_deviation, note
        from public.item_tolerance_ranges
        where item_seq = target.seq
        except
        select nominal_min, nominal_max, upper_deviation, lower_deviation, note
        from public.item_tolerance_ranges
        where item_seq = source_item_seq
      )
    );

  if mismatched_item_count <> 0 then
    raise exception '% target items do not match source tolerance ranges', mismatched_item_count;
  end if;
end
$$;
