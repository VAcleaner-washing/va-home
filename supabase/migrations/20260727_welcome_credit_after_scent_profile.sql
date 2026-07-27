create table if not exists public.welcome_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_email text not null,
  promo_code_id uuid not null references public.promo_codes(id) on delete restrict,
  amount numeric(10,2) not null default 100 check (amount = 100),
  status text not null default 'active' check (status in ('active','used','expired','cancelled')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint welcome_credits_user_unique unique (user_id),
  constraint welcome_credits_email_unique unique (customer_email),
  constraint welcome_credits_promo_unique unique (promo_code_id),
  constraint welcome_credits_email_normalized check (customer_email = lower(btrim(customer_email)))
);

create index if not exists welcome_credits_status_expires_idx
  on public.welcome_credits(status, expires_at);

alter table public.welcome_credits enable row level security;

drop policy if exists "Customers read own welcome credits" on public.welcome_credits;
create policy "Customers read own welcome credits"
  on public.welcome_credits
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.welcome_credits from anon;
revoke insert, update, delete on table public.welcome_credits from authenticated;
grant select on table public.welcome_credits to authenticated;
