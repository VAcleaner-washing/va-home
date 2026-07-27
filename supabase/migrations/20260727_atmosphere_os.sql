-- VA HOME v14.0.0 — Atmosphere OS
-- Personal Scent Profile, Discovery Credit, Private Preview and atomic promo consumption.

create extension if not exists pgcrypto;

create table if not exists public.user_scent_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  profile_title text not null,
  profile_text text,
  profile_tags text[] not null default '{}',
  recommendation_ids text[] not null default '{}',
  match_scores jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_scent_profiles enable row level security;

drop policy if exists "Customers read own scent profile" on public.user_scent_profiles;
create policy "Customers read own scent profile"
on public.user_scent_profiles for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Customers create own scent profile" on public.user_scent_profiles;
create policy "Customers create own scent profile"
on public.user_scent_profiles for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Customers update own scent profile" on public.user_scent_profiles;
create policy "Customers update own scent profile"
on public.user_scent_profiles for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Customers delete own scent profile" on public.user_scent_profiles;
create policy "Customers delete own scent profile"
on public.user_scent_profiles for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins manage scent profiles" on public.user_scent_profiles;
create policy "Admins manage scent profiles"
on public.user_scent_profiles for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Customers read own personal promo codes" on public.promo_codes;
create policy "Customers read own personal promo codes"
on public.promo_codes for select to authenticated
using (customer_email is not null and lower(customer_email) = lower(coalesce(auth.jwt()->>'email','')));

create table if not exists public.discovery_credits (
  id uuid primary key default gen_random_uuid(),
  order_id bigint not null unique references public.orders(id) on delete cascade,
  customer_email text not null,
  promo_code_id uuid not null unique references public.promo_codes(id) on delete cascade,
  amount numeric(12,2) not null default 150,
  status text not null default 'active' check (status in ('active','used','expired','cancelled')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discovery_credits_email_lowercase check (customer_email = lower(customer_email))
);

create index if not exists discovery_credits_email_idx on public.discovery_credits (customer_email);
create index if not exists discovery_credits_status_idx on public.discovery_credits (status, expires_at);

alter table public.discovery_credits enable row level security;

drop policy if exists "Customers read own discovery credits" on public.discovery_credits;
create policy "Customers read own discovery credits"
on public.discovery_credits for select to authenticated
using (
  lower(customer_email) = lower(coalesce(auth.jwt()->>'email',''))
  or exists (select 1 from public.orders o where o.id = order_id and o.customer_user_id = auth.uid())
);

drop policy if exists "Admins manage discovery credits" on public.discovery_credits;
create policy "Admins manage discovery credits"
on public.discovery_credits for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create table if not exists public.private_releases (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  eyebrow text not null default 'PRIVATE RELEASE',
  title text not null,
  description text not null,
  product_id text,
  image_url text,
  preview_starts_at timestamptz not null,
  public_starts_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_release_window check (public_starts_at > preview_starts_at)
);

create index if not exists private_releases_window_idx
on public.private_releases (active, preview_starts_at, public_starts_at);

alter table public.private_releases enable row level security;

drop policy if exists "Public sees released previews" on public.private_releases;
create policy "Public sees released previews"
on public.private_releases for select to anon, authenticated
using (active and now() >= public_starts_at);

drop policy if exists "Members see private preview" on public.private_releases;
create policy "Members see private preview"
on public.private_releases for select to authenticated
using (active and now() >= preview_starts_at);

drop policy if exists "Admins manage private releases" on public.private_releases;
create policy "Admins manage private releases"
on public.private_releases for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create or replace function public.issue_discovery_credit_for_order(p_order_id bigint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  existing_credit uuid;
  generated_code text;
  created_promo_id uuid;
  credit_id uuid;
  credit_amount numeric(12,2);
  attempt integer;
begin
  select * into o from public.orders where id = p_order_id;
  if not found or o.status <> 'completed' or coalesce(trim(o.customer_email),'') = '' then return null; end if;

  select id into existing_credit from public.discovery_credits where order_id = o.id;
  if existing_credit is not null then return existing_credit; end if;

  select max(
    case item->>'id'
      when 'discovery-18' then 450
      when 'discovery-17' then 450
      when 'discovery-6' then 150
      else null
    end
  )
  into credit_amount
  from jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) item;

  if credit_amount is null then return null; end if;

  for attempt in 1..6 loop
    generated_code := 'VA-DISC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    begin
      insert into public.promo_codes (
        code, name, discount_type, discount_value, min_order_amount, applies_to,
        starts_at, ends_at, usage_limit, usage_count, active,
        customer_email, campaign_type, source_order_id, updated_at
      ) values (
        generated_code,
        'Discovery Credit · ' || o.client_order_id,
        'fixed', credit_amount, 799, 'fragrances',
        now(), now() + interval '60 days', 1, 0, true,
        lower(trim(o.customer_email)), 'discovery_credit', o.id, now()
      ) returning id into created_promo_id;
      exit;
    exception when unique_violation then
      created_promo_id := null;
    end;
  end loop;

  if created_promo_id is null then raise exception 'DISCOVERY_CREDIT_CODE_GENERATION_FAILED'; end if;

  insert into public.discovery_credits (
    order_id, customer_email, promo_code_id, amount, expires_at
  ) values (
    o.id, lower(trim(o.customer_email)), created_promo_id, credit_amount, now() + interval '60 days'
  ) returning id into credit_id;

  return credit_id;
end;
$$;

create or replace function public.issue_discovery_credit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.issue_discovery_credit_for_order(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists issue_discovery_credit_on_completion on public.orders;
create trigger issue_discovery_credit_on_completion
after insert or update of status on public.orders
for each row execute function public.issue_discovery_credit_trigger();

create unique index if not exists promo_redemptions_order_code_unique
on public.promo_redemptions (order_id, promo_code_id);

revoke all on function public.issue_discovery_credit_for_order(bigint) from public, anon, authenticated;

grant select, insert, update, delete on public.user_scent_profiles to authenticated;
grant select on public.discovery_credits to authenticated;
grant select on public.private_releases to anon, authenticated;
