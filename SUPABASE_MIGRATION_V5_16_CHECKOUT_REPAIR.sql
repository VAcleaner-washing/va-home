-- VA HOME v5.16.2 — idempotent checkout repair.
-- Run once in Supabase SQL Editor before redeploying create-order.

alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists payment_method text not null default 'bank_transfer';
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists nova_poshta_city_ref text;
alter table public.orders add column if not exists nova_poshta_settlement_ref text;
alter table public.orders add column if not exists nova_poshta_warehouse_ref text;
alter table public.orders add column if not exists confirmation_email_status text not null default 'pending';
alter table public.orders add column if not exists checkout_request_id text;

create unique index if not exists orders_client_order_id_key
  on public.orders(client_order_id);

create index if not exists orders_nova_poshta_warehouse_ref_idx
  on public.orders(nova_poshta_warehouse_ref)
  where nova_poshta_warehouse_ref is not null;

create unique index if not exists orders_checkout_request_id_key
  on public.orders(checkout_request_id)
  where checkout_request_id is not null;

-- Public checkout writes only through the validated create-order Edge Function.
drop policy if exists "Anyone can create orders" on public.orders;
drop policy if exists "Anyone can submit a website order" on public.orders;
revoke insert on table public.orders from anon, authenticated;
revoke usage, select on sequence public.orders_id_seq from anon, authenticated;

-- The result must contain eight rows. Any false value means the schema is incomplete.
select required.column_name,
       exists (
         select 1
         from information_schema.columns c
         where c.table_schema = 'public'
           and c.table_name = 'orders'
           and c.column_name = required.column_name
       ) as present
from (values
  ('customer_email'),
  ('payment_method'),
  ('payment_status'),
  ('nova_poshta_city_ref'),
  ('nova_poshta_settlement_ref'),
  ('nova_poshta_warehouse_ref'),
  ('confirmation_email_status')
  ,('checkout_request_id')
) as required(column_name);
