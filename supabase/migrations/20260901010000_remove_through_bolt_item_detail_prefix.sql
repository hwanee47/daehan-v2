do $$
declare
  affected_count integer;
begin
  update public.item_details as detail
  set item_detail_name = target.next_name
  from (
    values
      (1::bigint, 'THROUGH BOLT BOTTOM NUT'::text, 'BOTTOM NUT'::text),
      (2::bigint, 'THROUGH BOLT TOP NUT'::text, 'TOP NUT'::text),
      (4::bigint, 'THROUGH BOLT WASHER'::text, 'WASHER'::text),
      (5::bigint, 'THROUGH BOLT TOP NUT'::text, 'TOP NUT'::text),
      (7::bigint, 'THROUGH BOLT WASHER'::text, 'WASHER'::text),
      (8::bigint, 'THROUGH BOLT TOP NUT'::text, 'TOP NUT'::text),
      (10::bigint, 'THROUGH BOLT WASHER'::text, 'WASHER'::text),
      (11::bigint, 'THROUGH BOLT TOP NUT'::text, 'TOP NUT'::text),
      (13::bigint, 'THROUGH BOLT WASHER'::text, 'WASHER'::text),
      (14::bigint, 'THROUGH BOLT TOP NUT'::text, 'TOP NUT'::text)
  ) as target(seq, previous_name, next_name)
  where detail.seq = target.seq
    and detail.item_detail_name = target.previous_name;

  get diagnostics affected_count = row_count;

  if affected_count <> 10 then
    raise exception
      'Expected to update 10 THROUGH BOLT item details, but updated %',
      affected_count;
  end if;
end;
$$;
