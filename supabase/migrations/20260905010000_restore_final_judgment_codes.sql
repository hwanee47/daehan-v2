insert into public.code_groups (
  group_code,
  group_name,
  description,
  sort_order,
  is_active
)
values (
  'FINAL_JUDGMENT_STATUS',
  '최종판정상태',
  '검사성적서 최종판정상태 코드',
  20,
  true
)
on conflict (group_code) do update
set group_name = excluded.group_name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

with judgment_group as (
  select seq
  from public.code_groups
  where group_code = 'FINAL_JUDGMENT_STATUS'
)
insert into public.code_details (
  code_group_seq,
  code,
  code_name,
  description,
  sort_order,
  is_active
)
select judgment_group.seq, values_to_insert.code, values_to_insert.code_name,
  values_to_insert.description, values_to_insert.sort_order, true
from judgment_group
cross join (
  values
    ('PASS', '합격', '검사성적서 최종 판정 합격', 10),
    ('FAIL', '불합격', '검사성적서 최종 판정 불합격', 20)
) as values_to_insert(code, code_name, description, sort_order)
on conflict (code_group_seq, code) do update
set code_name = excluded.code_name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();
