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

-- Repair previously issued, still-unused credits for full Discovery Set orders.
update public.discovery_credits dc
set amount = 450,
    updated_at = now()
from public.orders o,
     public.promo_codes pc
where dc.order_id = o.id
  and pc.id = dc.promo_code_id
  and coalesce(pc.usage_count, 0) = 0
  and exists (
    select 1
    from jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) item
    where item->>'id' in ('discovery-18', 'discovery-17')
  );

update public.promo_codes pc
set discount_value = 450,
    updated_at = now()
from public.discovery_credits dc,
     public.orders o
where dc.promo_code_id = pc.id
  and dc.order_id = o.id
  and coalesce(pc.usage_count, 0) = 0
  and exists (
    select 1
    from jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) item
    where item->>'id' in ('discovery-18', 'discovery-17')
  );

revoke all on function public.issue_discovery_credit_for_order(bigint) from public, anon, authenticated;
