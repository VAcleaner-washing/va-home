create extension if not exists pgcrypto;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text,
  discount_type text not null default 'fixed' check (discount_type in ('fixed','percent','free_shipping')),
  discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
  min_order_amount numeric(12,2) not null default 0 check (min_order_amount >= 0),
  applies_to text not null default 'all' check (applies_to in ('all','fragrances','products')),
  product_ids text[] not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists promo_codes_code_unique on public.promo_codes (upper(code));

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  customer_email text,
  customer_phone text,
  discount_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

drop policy if exists "Admins manage promo codes" on public.promo_codes;
create policy "Admins manage promo codes" on public.promo_codes for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins view promo redemptions" on public.promo_redemptions;
create policy "Admins view promo redemptions" on public.promo_redemptions for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

insert into public.promo_codes(code,name,discount_type,discount_value,applies_to,active)
values ('TEST','Знижка після тесту аромату','fixed',100,'fragrances',true)
on conflict ((upper(code))) do nothing;
