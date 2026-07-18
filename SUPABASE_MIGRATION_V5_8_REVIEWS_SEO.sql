-- VA HOME v5.8 — verified-review integrity hardening.
-- Run after SUPABASE_MIGRATION_V5_6_CUSTOMER_TRUST.sql.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reviews_rating_valid' and conrelid = 'public.reviews'::regclass) then
    alter table public.reviews add constraint reviews_rating_valid check (rating between 1 and 5) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reviews_status_valid' and conrelid = 'public.reviews'::regclass) then
    alter table public.reviews add constraint reviews_status_valid check (status in ('pending', 'approved', 'rejected')) not valid;
  end if;
end $$;
alter table public.reviews validate constraint reviews_rating_valid;
alter table public.reviews validate constraint reviews_status_valid;

-- Browser clients can never assign or edit the server-owned verified flag.
revoke insert, delete on table public.reviews from anon, authenticated;
revoke update on table public.reviews from anon, authenticated;
grant update(status) on table public.reviews to authenticated;

-- Avoid duplicate active reviews from the same signed-in customer for one aroma.
-- Existing duplicates, if any, are intentionally left untouched; the Edge Function
-- rejects new duplicates before insertion.
create index if not exists reviews_owner_product_status_idx
  on public.reviews(created_by, product_slug, status)
  where created_by is not null and status in ('pending', 'approved');
