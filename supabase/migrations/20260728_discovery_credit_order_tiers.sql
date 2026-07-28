-- VA HOME RC6.3 — tiered Discovery Credit redemption
-- 6-scent set: 150 UAH on one full-size fragrance.
-- 18-scent set: 250 UAH on one full-size fragrance, or 450 UAH on two or more.

create or replace function public.atomic_promo_redemption_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_promo public.promo_codes;
  v_subtotal numeric(12,2) := 0;
  v_expected_discount numeric(12,2) := 0;
  v_expected_total numeric(12,2) := 0;
  v_eligible boolean := false;
  v_full_size_quantity integer := 0;
  v_inserted integer := 0;
begin
  if coalesce(trim(new.promo_code), '') = '' then return new; end if;

  select * into v_promo
  from public.promo_codes
  where lower(code) = lower(trim(new.promo_code))
  for update;

  select coalesce(sum(coalesce((item->>'line_total')::numeric, 0)), 0),
         coalesce(sum(case when item->>'id' in (
           'signature-relax','forbidden-fruit','doux-moment','wild-berry-way','hotel-spring',
           'evening-ritual','velvet-spa','pure-zen','hotel-luxe','old-money','linstinct',
           'mineral-salt','pure-imagination','silk-molecule','the-archive','silent-temple',
           'moss-and-shadow','dark-bloom'
         ) then greatest(coalesce((item->>'quantity')::integer, 1), 1) else 0 end), 0)
  into v_subtotal, v_full_size_quantity
  from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) item;

  if not found
     or not v_promo.active
     or (v_promo.starts_at is not null and v_promo.starts_at > now())
     or (v_promo.ends_at is not null and v_promo.ends_at < now())
     or (v_promo.usage_limit is not null and coalesce(v_promo.usage_count, 0) >= v_promo.usage_limit)
     or v_subtotal < coalesce(v_promo.min_order_amount, 0)
     or (v_promo.customer_email is not null and lower(trim(v_promo.customer_email)) <> lower(trim(new.customer_email))) then
    raise exception using errcode = 'P0001', message = 'INVALID_PROMO';
  end if;

  select case
    when v_promo.applies_to = 'all' then true
    when v_promo.applies_to = 'fragrances' then v_full_size_quantity > 0
    when v_promo.applies_to = 'products' then exists (
      select 1 from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) item
      where item->>'id' = any(coalesce(v_promo.product_ids, array[]::text[]))
    )
    else false
  end into v_eligible;
  if not v_eligible then raise exception using errcode = 'P0001', message = 'INVALID_PROMO'; end if;

  if v_promo.campaign_type = 'discovery_credit' then
    if coalesce(v_promo.discount_value, 0) >= 450 then
      v_expected_discount := case when v_full_size_quantity >= 2 then 450 else 250 end;
    else
      v_expected_discount := least(150, coalesce(v_promo.discount_value, 0));
    end if;
    v_expected_discount := least(v_subtotal, v_expected_discount);
  elsif v_promo.discount_type = 'fixed' then
    v_expected_discount := least(v_subtotal, coalesce(v_promo.discount_value, 0));
  elsif v_promo.discount_type = 'percent' then
    v_expected_discount := least(v_subtotal, round(v_subtotal * coalesce(v_promo.discount_value, 0) / 100, 2));
  elsif v_promo.discount_type = 'free_shipping' then
    v_expected_discount := 0;
  else
    raise exception using errcode = 'P0001', message = 'INVALID_PROMO';
  end if;

  v_expected_total := round(v_subtotal - v_expected_discount, 2);
  if round(coalesce(new.discount_amount, 0), 2) <> v_expected_discount
     or round(coalesce(new.total_amount, 0), 2) <> v_expected_total then
    raise exception using errcode = 'P0001', message = 'PROMO_TOTAL_MISMATCH';
  end if;

  insert into public.promo_redemptions (
    promo_code_id, order_id, customer_email, customer_phone, discount_amount
  ) values (
    v_promo.id, new.id, lower(trim(new.customer_email)), new.customer_phone, v_expected_discount
  ) on conflict (promo_code_id, order_id) where order_id is not null do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    update public.promo_codes
    set usage_count = coalesce(usage_count, 0) + 1, updated_at = now()
    where id = v_promo.id;
  end if;
  return new;
end;
$$;

revoke all on function public.atomic_promo_redemption_guard() from public, anon, authenticated;
