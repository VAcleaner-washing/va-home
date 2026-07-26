-- VA HOME v13.8.9 — checkout order schema compatibility
-- Safe to run repeatedly.

alter table public.orders
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists promo_code text;

create index if not exists orders_promo_code_idx
  on public.orders (lower(promo_code))
  where promo_code is not null;
