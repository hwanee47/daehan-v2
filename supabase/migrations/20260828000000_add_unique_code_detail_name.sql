create unique index code_details_group_code_name_unique
on public.code_details (
  code_group_seq,
  lower(btrim(code_name))
);

comment on index public.code_details_group_code_name_unique is
'같은 코드그룹 안에서 앞뒤 공백과 영문 대소문자를 무시한 상세 코드명 중복 방지';
