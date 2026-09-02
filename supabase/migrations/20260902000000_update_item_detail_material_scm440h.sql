do $$
declare
  updated_count bigint;
begin
  update public.item_details
  set material = 'SCM440H'
  where material = 'SCM440';

  get diagnostics updated_count = row_count;
  raise notice 'Updated % item_details material rows from SCM440 to SCM440H.', updated_count;
end
$$;
