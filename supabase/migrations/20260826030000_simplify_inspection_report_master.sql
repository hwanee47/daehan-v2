drop index if exists public.inspection_reports_inspection_date_idx;
drop index if exists public.inspection_reports_item_detail_idx;
drop index if exists public.inspection_reports_status_idx;

alter table public.inspection_reports
  alter column customer_name drop not null,
  alter column supplier_name drop not null,
  alter column delivery_quantity drop not null,
  alter column sample_count drop not null,
  drop column delivery_date,
  drop column inspector_name,
  drop column inspection_date,
  drop column special_notes,
  drop column status;

create index inspection_reports_item_detail_idx
on public.inspection_reports (item_detail_seq, created_at desc, seq desc);

comment on column public.inspection_reports.customer_name is '선택 고객명';
comment on column public.inspection_reports.supplier_name is '선택 업체명';
comment on column public.inspection_reports.delivery_quantity is '선택 납품수량';
comment on column public.inspection_reports.sample_count is '선택 검사 시료수, 입력 시 1 이상 10 이하';
