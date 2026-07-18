-- VA HOME v5.5 — secure checkout foundation.
-- Run once in Supabase SQL Editor, then deploy the create-order Edge Function.

alter table public.orders add column if not exists confirmation_email_status text not null default 'pending'
  check (confirmation_email_status in ('pending','sent','failed'));

-- Website visitors must not be able to insert browser-calculated prices directly.
drop policy if exists "Anyone can create orders" on public.orders;
drop policy if exists "Anyone can submit a website order" on public.orders;
revoke insert on table public.orders from anon, authenticated;
revoke usage, select on sequence public.orders_id_seq from anon, authenticated;

-- Existing admin/customer SELECT/UPDATE policies from v5 stay unchanged.
-- create-order uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS only after
-- validating the product IDs, quantities, contacts, delivery and payment.
