create or replace function public.ensure_u0003_codes(p_code_names text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  u0003_group_seq bigint;
  requested_name text;
  normalized_name text;
  next_code bigint;
  generated_code text;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_code_names is null or cardinality(p_code_names) = 0 then
    return;
  end if;

  if cardinality(p_code_names) > 50 then
    raise exception 'too many code names' using errcode = '22023';
  end if;

  select seq into u0003_group_seq
  from public.code_groups
  where group_code = 'U0003' and is_active
  limit 1;

  if u0003_group_seq is null then
    raise exception 'U0003 code group not found' using errcode = '23503';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('public.code_details:U0003', 0));

  foreach requested_name in array p_code_names loop
    normalized_name := btrim(requested_name);
    if normalized_name = '' or char_length(normalized_name) > 100 then
      raise exception 'invalid code name' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.code_details
      where code_group_seq = u0003_group_seq
        and lower(btrim(code_name)) = lower(normalized_name)
    ) then
      continue;
    end if;

    select coalesce(max(code::bigint), 0) + 1 into next_code
    from public.code_details
    where code_group_seq = u0003_group_seq
      and code ~ '^[0-9]{1,18}$';

    generated_code := lpad(next_code::text, 2, '0');

    insert into public.code_details (
      code_group_seq,
      code,
      code_name,
      description,
      sort_order,
      is_active,
      created_by,
      updated_by
    ) values (
      u0003_group_seq,
      generated_code,
      normalized_name,
      null,
      least(next_code, 2147483647)::integer,
      true,
      actor_id,
      actor_id
    );
  end loop;
end;
$$;

revoke all on function public.ensure_u0003_codes(text[]) from public, anon, authenticated;
grant execute on function public.ensure_u0003_codes(text[]) to authenticated;

comment on function public.ensure_u0003_codes(text[]) is
'검사성적서에서 직접 입력한 기준치수를 U0003 활성 상세 코드로 안전하게 보장';
