alter table public.items
add column image_path text,
add constraint items_image_path_format
check (
  image_path is null
  or image_path ~ (
    '^items/' || seq::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  )
);

comment on column public.items.image_path is '비공개 item-images bucket의 품목 대표 이미지 object path';

alter table public.item_details
add column image_path text,
add constraint item_details_image_path_format
check (
  image_path is null
  or image_path ~ (
    '^item-details/' || seq::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  )
);

comment on column public.item_details.image_path is '비공개 item-images bucket의 품목상세 대표 이미지 object path';

grant update (image_path)
on public.items to authenticated;

grant update (image_path)
on public.item_details to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'item-images',
  'item-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "item_images_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'item-images');

create policy "item_images_insert_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'item-images'
  and name ~ '^(items|item-details)/[1-9][0-9]*/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  and exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role = 'admin'
  )
);

create policy "item_images_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'item-images'
  and name ~ '^(items|item-details)/[1-9][0-9]*/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  and exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role = 'admin'
  )
);
