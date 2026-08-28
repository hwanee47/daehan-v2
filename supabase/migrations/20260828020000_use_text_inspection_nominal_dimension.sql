alter table public.inspection_report_items
alter column nominal_dimension type text
using trim_scale(nominal_dimension)::text;

alter table public.inspection_report_items
add constraint inspection_report_items_nominal_dimension_text_check
check (
  nullif(btrim(nominal_dimension), '') is not null
  and char_length(nominal_dimension) <= 100
);

alter table public.inspection_measurement_run_items
alter column nominal_dimension type text
using trim_scale(nominal_dimension)::text;

alter table public.inspection_measurement_run_items
add constraint inspection_measurement_run_items_nominal_dimension_text_check
check (
  nullif(btrim(nominal_dimension), '') is not null
  and char_length(nominal_dimension) <= 100
);

comment on column public.inspection_report_items.nominal_dimension is
'숫자, 기호 또는 문자를 포함할 수 있는 기준치수 원문';

comment on column public.inspection_measurement_run_items.nominal_dimension is
'측정 당시 숫자, 기호 또는 문자를 포함한 기준치수 원문 스냅샷';
