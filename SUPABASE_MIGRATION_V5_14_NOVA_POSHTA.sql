-- VA HOME v5.14 — normalized Nova Poshta delivery identifiers.
-- Run once in Supabase SQL Editor before deploying create-order v5.14.

alter table public.orders add column if not exists nova_poshta_city_ref text;
alter table public.orders add column if not exists nova_poshta_warehouse_ref text;
alter table public.orders add column if not exists nova_poshta_settlement_ref text;

create index if not exists orders_nova_poshta_warehouse_ref_idx
  on public.orders(nova_poshta_warehouse_ref)
  where nova_poshta_warehouse_ref is not null;
