-- VA HOME v13.8.35 — repeat purchase email campaign
-- 55 days after order completion, 100 UAH personal promo, valid 7 days.
-- Existing orders remain opted out; marketing consent is explicit and optional.

create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table public.orders
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists completed_at timestamptz,
  add column if not exists repeat_campaign_sent_at timestamptz;

alter table public.promo_codes
  add column if not exists customer_email text,
  add column if not exists campaign_type text,
  add column if not exists source_order_id bigint references public.orders(id) on delete set null;

create index if not exists promo_codes_customer_email_idx
  on public.promo_codes (lower(customer_email))
  where customer_email is not null;

create table if not exists public.marketing_preferences (
  email text primary key,
  subscribed boolean not null default false,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  source_order_id bigint references public.orders(id) on delete set null,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_preferences_email_lowercase check (email = lower(email))
);

create table if not exists public.repeat_purchase_campaigns (
  id uuid primary key default gen_random_uuid(),
  order_id bigint not null unique references public.orders(id) on delete cascade,
  customer_email text not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','sending','sent','skipped','failed')),
  promo_code_id uuid references public.promo_codes(id) on delete set null,
  sent_at timestamptz,
  provider_message_id text,
  attempt_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists repeat_purchase_campaigns_due_idx
  on public.repeat_purchase_campaigns (scheduled_for, status)
  where status in ('pending','failed');

alter table public.marketing_preferences enable row level security;
alter table public.repeat_purchase_campaigns enable row level security;

drop policy if exists "Admins view marketing preferences" on public.marketing_preferences;
create policy "Admins view marketing preferences"
on public.marketing_preferences for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins view repeat campaigns" on public.repeat_purchase_campaigns;
create policy "Admins view repeat campaigns"
on public.repeat_purchase_campaigns for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Preserve existing timestamp behavior and record the first completion time.
create or replace function public.set_order_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  if new.status is distinct from old.status then
    new.status_changed_at = now();
    if new.status = 'completed' and new.completed_at is null then
      new.completed_at = now();
    end if;
  end if;
  return new;
end;
$$;

update public.orders
set completed_at = coalesce(completed_at, status_changed_at, updated_at, created_at)
where status = 'completed' and completed_at is null;

create or replace function public.schedule_repeat_purchase_campaign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_full_size_fragrance boolean;
begin
  if new.status <> 'completed'
     or not new.marketing_consent
     or coalesce(trim(new.customer_email), '') = ''
     or new.repeat_campaign_sent_at is not null then
    return new;
  end if;

  select exists (
    select 1
    from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) item
    where item->>'id' in (
      'signature-relax','forbidden-fruit','doux-moment','wild-berry-way','hotel-spring',
      'evening-ritual','velvet-spa','pure-zen','hotel-luxe','old-money','linstinct',
      'mineral-salt','pure-imagination','silk-molecule','the-archive','silent-temple',
      'moss-and-shadow','dark-bloom'
    )
  ) into has_full_size_fragrance;

  if not has_full_size_fragrance then return new; end if;

  insert into public.repeat_purchase_campaigns (
    order_id, customer_email, scheduled_for
  ) values (
    new.id,
    lower(trim(new.customer_email)),
    coalesce(new.completed_at, new.status_changed_at, now()) + interval '55 days'
  )
  on conflict (order_id) do update
    set customer_email = excluded.customer_email,
        scheduled_for = excluded.scheduled_for,
        updated_at = now()
    where public.repeat_purchase_campaigns.status in ('pending','failed');

  return new;
end;
$$;

drop trigger if exists schedule_repeat_purchase_campaign_trigger on public.orders;
create trigger schedule_repeat_purchase_campaign_trigger
after insert or update of status, marketing_consent, customer_email on public.orders
for each row execute function public.schedule_repeat_purchase_campaign();

-- A random cron secret is generated inside Postgres during deployment. Only
-- its SHA-256 digest is stored in the application table; the plain value exists
-- solely in the protected pg_cron command and never enters the public archive.
create table if not exists public.automation_secrets (
  name text primary key,
  secret_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.automation_secrets enable row level security;

-- Recreate the daily job idempotently. 08:15 UTC is late morning in Ukraine.
do $$
declare
  existing_job bigint;
  cron_secret text := encode(gen_random_bytes(32), 'hex');
  cron_command text;
begin
  insert into public.automation_secrets (name, secret_sha256, updated_at)
  values (
    'repeat_purchase_cron',
    encode(digest(cron_secret, 'sha256'), 'hex'),
    now()
  )
  on conflict (name) do update
  set secret_sha256 = excluded.secret_sha256, updated_at = now();

  select jobid into existing_job
  from cron.job
  where jobname = 'va-home-repeat-purchase-daily'
  limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  cron_command := format(
    'select net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'', ''application/json'', ''x-cron-secret'', %L), body := %L::jsonb);',
    'https://yweluzclearwrazdkahu.supabase.co/functions/v1/process-repeat-purchase',
    cron_secret,
    '{"source":"cron"}'
  );

  perform cron.schedule(
    'va-home-repeat-purchase-daily',
    '15 8 * * *',
    cron_command
  );
end $$;
