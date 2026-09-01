do $$
declare
  target_count integer;
  affected_count integer;
begin
  select count(*)
  into target_count
  from public.item_details
  where item_detail_name like 'THROUGH BOLT %';

  if target_count <> 76 then
    raise exception
      'Expected 76 remaining THROUGH BOLT item details, but found %',
      target_count;
  end if;

  if exists (
    select 1
    from public.item_details
    where item_detail_name like 'THROUGH BOLT %'
      and regexp_replace(item_detail_name, '^THROUGH BOLT[[:space:]]+', '')
        not in ('BOTTOM NUT', 'TOP NUT', 'WASHER')
  ) then
    raise exception 'Unexpected THROUGH BOLT item detail suffix found';
  end if;

  update public.item_details
  set item_detail_name = regexp_replace(
    item_detail_name,
    '^THROUGH BOLT[[:space:]]+',
    ''
  )
  where item_detail_name like 'THROUGH BOLT %';

  get diagnostics affected_count = row_count;

  if affected_count <> 76 then
    raise exception
      'Expected to update 76 THROUGH BOLT item details, but updated %',
      affected_count;
  end if;

  if exists (
    select 1
    from public.item_details
    where item_detail_name like 'THROUGH BOLT %'
  ) then
    raise exception 'THROUGH BOLT item detail prefixes remain after update';
  end if;
end;
$$;
