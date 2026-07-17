-- VA HOME v5 / Stage 1
-- Orders admin, review moderation, public order tracking and secure admin access.
-- Run once in Supabase SQL Editor after SUPABASE_MIGRATION_V4.sql.

create extension if not exists pgcrypto;

-- 1) Order workflow fields
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists admin_note text;
alter table public.orders add column if not exists updated_at timestamptz not null default now();
alter table public.orders add column if not exists status_changed_at timestamptz not null default now();

-- Normalize old values without breaking existing rows.
update public.orders
set status = case
  when status in ('new','awaiting_payment','paid','shipped','completed','cancelled') then status
  else 'new'
end;

update public.orders
set payment_status = case
  when payment_status in ('unpaid','verification','paid','refunded') then payment_status
  else 'unpaid'
end;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('new','awaiting_payment','paid','shipped','completed','cancelled'));

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid','verification','paid','refunded'));

create or replace function public.set_order_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_timestamps on public.orders;
create trigger trg_orders_timestamps
before update on public.orders
for each row execute function public.set_order_timestamps();

-- 2) Explicit admin allow-list linked to Supabase Auth users.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users au where au.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Admin can see their own allow-list row.
drop policy if exists "Admins can read admin allowlist" on public.admin_users;
create policy "Admins can read admin allowlist"
on public.admin_users for select to authenticated
using (user_id = auth.uid());

-- 3) Admin policies for orders.
drop policy if exists "Admins can read orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can read orders"
on public.orders for select to authenticated
using (public.is_admin());
create policy "Admins can update orders"
on public.orders for update to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, update on table public.orders to authenticated;

-- 4) Admin policies for reviews.
drop policy if exists "Admins can read all reviews" on public.reviews;
drop policy if exists "Admins can moderate reviews" on public.reviews;
create policy "Admins can read all reviews"
on public.reviews for select to authenticated
using (public.is_admin() or status = 'approved');
create policy "Admins can moderate reviews"
on public.reviews for update to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, update on table public.reviews to authenticated;

-- 5) Public order tracking: customer must provide order number + last 4 phone digits.
create or replace function public.get_public_order_status(
  p_order_number text,
  p_phone_last4 text
)
returns table (
  client_order_id text,
  status text,
  payment_status text,
  tracking_number text,
  items jsonb,
  total_amount numeric,
  created_at timestamptz,
  status_changed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.client_order_id,
    o.status,
    o.payment_status,
    o.tracking_number,
    o.items,
    o.total_amount,
    o.created_at,
    o.status_changed_at
  from public.orders o
  where upper(trim(o.client_order_id)) = upper(trim(p_order_number))
    and right(regexp_replace(o.customer_phone, '\\D', '', 'g'), 4) = regexp_replace(p_phone_last4, '\\D', '', 'g')
  limit 1;
$$;

revoke all on function public.get_public_order_status(text,text) from public;
grant execute on function public.get_public_order_status(text,text) to anon, authenticated;

-- 6) Helpful indexes.
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_customer_email_idx on public.orders(lower(customer_email));
create index if not exists reviews_status_created_idx on public.reviews(status, created_at desc);

-- IMPORTANT, after creating the Auth user in Authentication → Users, run once:
-- insert into public.admin_users(user_id, email)
-- select id, email from auth.users where lower(email)=lower('vahome.aroma@gmail.com')
-- on conflict (user_id) do update set email=excluded.email;
