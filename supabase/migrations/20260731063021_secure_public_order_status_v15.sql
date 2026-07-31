create table if not exists public.order_status_rate_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  attempts integer not null default 1 check (attempts > 0),
  updated_at timestamptz not null default now(),
  primary key (ip_hash, window_start)
);

alter table public.order_status_rate_limits enable row level security;

revoke all on table public.order_status_rate_limits from public, anon, authenticated;
grant all on table public.order_status_rate_limits to service_role;

create or replace function public.consume_order_status_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / 900) * 900);
  current_attempts integer;
begin
  if p_ip_hash is null or length(p_ip_hash) <> 64 then
    return false;
  end if;

  insert into public.order_status_rate_limits (
    ip_hash,
    window_start,
    attempts,
    updated_at
  )
  values (
    p_ip_hash,
    current_window,
    1,
    now()
  )
  on conflict (ip_hash, window_start)
  do update
    set attempts = public.order_status_rate_limits.attempts + 1,
        updated_at = now()
  returning attempts into current_attempts;

  delete from public.order_status_rate_limits
  where window_start < now() - interval '1 day';

  return current_attempts <= 5;
end;
$$;

revoke execute on function public.consume_order_status_rate_limit(text)
  from public, anon, authenticated;
grant execute on function public.consume_order_status_rate_limit(text)
  to service_role;

revoke execute on function public.get_public_order_status(text, text)
  from public, anon, authenticated;
grant execute on function public.get_public_order_status(text, text)
  to service_role;

revoke execute on function public.claim_customer_orders()
  from public, anon;
grant execute on function public.claim_customer_orders()
  to authenticated, service_role;

revoke execute on function public.is_admin()
  from public, anon;
grant execute on function public.is_admin()
  to authenticated, service_role;

revoke execute on function public.issue_discovery_credit_trigger()
  from public, anon, authenticated;
revoke execute on function public.mark_personal_credit_used()
  from public, anon, authenticated;
revoke execute on function public.schedule_repeat_purchase_campaign()
  from public, anon, authenticated;
