alter table public.inspection_report_items
add column marker_x_ratio numeric(7, 6),
add column marker_y_ratio numeric(7, 6),
add constraint inspection_report_items_marker_coordinates_pair_check
check ((marker_x_ratio is null) = (marker_y_ratio is null)),
add constraint inspection_report_items_marker_x_range_check
check (marker_x_ratio is null or marker_x_ratio between 0 and 1),
add constraint inspection_report_items_marker_y_range_check
check (marker_y_ratio is null or marker_y_ratio between 0 and 1);

comment on column public.inspection_report_items.marker_x_ratio is '품목상세 이미지 너비 기준 검사항목 순번 마커 X 좌표 비율';
comment on column public.inspection_report_items.marker_y_ratio is '품목상세 이미지 높이 기준 검사항목 순번 마커 Y 좌표 비율';

grant insert (
  sort_order,
  inspection_report_seq,
  nominal_dimension,
  tolerance_min,
  tolerance_max,
  marker_x_ratio,
  marker_y_ratio
) on public.inspection_report_items to authenticated;

grant update (
  sort_order,
  inspection_report_seq,
  nominal_dimension,
  tolerance_min,
  tolerance_max,
  marker_x_ratio,
  marker_y_ratio
) on public.inspection_report_items to authenticated;
