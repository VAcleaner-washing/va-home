create or replace function public.enforce_welcome_credit_first_purchase()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_campaign_type text;
  v_customer_email text;
begin
  if nullif(btrim(coalesce(new.promo_code, '')), '') is null then
    return new;
  end if;

  select campaign_type, customer_email
    into v_campaign_type, v_customer_email
  from public.promo_codes
  where lower(code) = lower(new.promo_code)
  limit 1;

  if v_campaign_type = 'welcome_scent_profile' then
    if lower(btrim(coalesce(new.customer_email, ''))) <> lower(btrim(coalesce(v_customer_email, ''))) then
      raise exception 'WELCOME_CREDIT_EMAIL_MISMATCH';
    end if;

    if not exists (
      select 1
      from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) item
      where coalesce(item->>'id', '') not like 'discovery-%'
    ) then
      raise exception 'WELCOME_CREDIT_REQUIRES_FULL_SIZE';
    end if;

    if exists (
      select 1
      from public.orders existing_order
      where lower(btrim(coalesce(existing_order.customer_email, ''))) = lower(btrim(new.customer_email))
        and existing_order.status <> 'cancelled'
        and exists (
          select 1
          from jsonb_array_elements(coalesce(existing_order.items, '[]'::jsonb)) existing_item
          where coalesce(existing_item->>'id', '') not like 'discovery-%'
        )
    ) then
      raise exception 'WELCOME_CREDIT_FIRST_PURCHASE_ONLY';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_welcome_credit_first_purchase() from public, anon, authenticated;

drop trigger if exists orders_enforce_welcome_credit_first_purchase on public.orders;
create trigger orders_enforce_welcome_credit_first_purchase
before insert on public.orders
for each row execute function public.enforce_welcome_credit_first_purchase();
