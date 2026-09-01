do $$
begin
  if exists (
    select 1
    from public.item_details
    where btrim(item_detail_name) ~ '^THROUGHT BOLT[[:space:]]+.+$'
      and nullif(
        btrim(regexp_replace(btrim(item_detail_name), '^THROUGHT BOLT[[:space:]]+', '')),
        ''
      ) is null
  ) then
    raise exception 'THROUGHT BOLT prefix removal would create an empty item detail name';
  end if;
end;
$$;

update public.item_details
set item_detail_name = btrim(
  regexp_replace(btrim(item_detail_name), '^THROUGHT BOLT[[:space:]]+', '')
)
where btrim(item_detail_name) ~ '^THROUGHT BOLT[[:space:]]+.+$';
