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
  has_discovery boolean;
  attempt integer;
begin
  select * into o from public.orders where id = p_order_id;
  if not found or o.status <> 'completed' or coalesce(trim(o.customer_email),'') = '' then return null; end if;

  select id into existing_credit from public.discovery_credits where order_id = o.id;
  if existing_credit is not null then return existing_credit; end if;

  select exists (
    select 1 from jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) item
    where item->>'id' in ('discovery-6','discovery-18','discovery-17')
  ) into has_discovery;
  if not has_discovery then return null; end if;

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
        'fixed', 150, 799, 'fragrances',
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
    o.id, lower(trim(o.customer_email)), created_promo_id, 150, now() + interval '60 days'
  ) returning id into credit_id;

  return credit_id;
end;
$$;
