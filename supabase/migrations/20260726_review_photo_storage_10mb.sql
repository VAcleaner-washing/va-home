-- VA HOME v13.8.15 — review photo Storage configuration
-- Safe to run repeatedly.
-- Keeps the Storage bucket aligned with the 10 MB limits used by the
-- storefront and the submit-review Edge Function.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'review-photos',
  'review-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Fail loudly during deployment if the setting was not applied.
do $$
declare
  current_limit bigint;
  current_public boolean;
begin
  select file_size_limit, public
    into current_limit, current_public
  from storage.buckets
  where id = 'review-photos';

  if current_limit is distinct from 10485760 then
    raise exception 'review-photos bucket limit is %, expected 10485760', current_limit;
  end if;

  if current_public is distinct from true then
    raise exception 'review-photos bucket must be public';
  end if;
end
$$;
