-- VA HOME v14.0.0 — personal-credit usage hardening
-- The production database already uses atomic_promo_redemption_guard_trigger:
-- it locks the promo row, validates totals and eligibility, writes the redemption,
-- and increments usage_count inside the order INSERT transaction.
-- This migration removes a legacy experimental reservation trigger if present
-- and connects successful redemptions to Discovery Credit status.

drop trigger if exists reserve_order_promo_atomic_trigger on public.orders;
drop function if exists public.reserve_order_promo_atomic();

create or replace function public.mark_personal_credit_used()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.discovery_credits
  set status = 'used', used_at = coalesce(used_at,now()), updated_at = now()
  where promo_code_id = new.promo_code_id and status = 'active';
  return new;
end;
$$;

drop trigger if exists mark_personal_credit_used_trigger on public.promo_redemptions;
create trigger mark_personal_credit_used_trigger
after insert on public.promo_redemptions
for each row execute function public.mark_personal_credit_used();
