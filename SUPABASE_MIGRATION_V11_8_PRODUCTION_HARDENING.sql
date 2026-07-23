-- VA HOME v11.8.2 — Production hardening
-- Run AFTER all previous V5 migrations, then redeploy Edge Functions.

begin;

-- Customer cabinet: an order becomes readable only after the verified-email
-- claim function links it to auth.uid(). This removes direct JWT-email matching.
drop policy if exists "Customers can read own orders" on public.orders;
create policy "Customers can read own orders"
on public.orders for select to authenticated
using (customer_user_id = auth.uid() or public.is_admin());

-- Keep the claim function strict: only a confirmed Auth email can claim guest orders.
create or replace function public.claim_customer_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_email text := lower(coalesce(auth.jwt()->>'email', ''));
  verified_at timestamptz;
  claimed integer := 0;
begin
  if auth.uid() is null or jwt_email = '' then return 0; end if;
  select email_confirmed_at into verified_at
  from auth.users
  where id = auth.uid() and lower(email) = jwt_email;
  if verified_at is null then return 0; end if;
  update public.orders
  set customer_user_id = auth.uid()
  where customer_user_id is null and lower(customer_email) = jwt_email;
  get diagnostics claimed = row_count;
  return claimed;
end;
$$;
revoke all on function public.claim_customer_orders() from public;
grant execute on function public.claim_customer_orders() to authenticated;

-- Public order status: reject malformed probes before touching the orders table.
create or replace function public.get_public_order_status(p_order_number text, p_phone_last4 text)
returns table (
  client_order_id text, status text, payment_status text, tracking_number text,
  items jsonb, total_amount numeric, created_at timestamptz, status_changed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if trim(coalesce(p_order_number,'')) !~* '^VA-[0-9]{6}-[A-F0-9]{6}$'
     or regexp_replace(coalesce(p_phone_last4,''), '\D', '', 'g') !~ '^[0-9]{4}$' then
    return;
  end if;
  return query
  select o.client_order_id, o.status, o.payment_status, o.tracking_number,
         o.items, o.total_amount, o.created_at, o.status_changed_at
  from public.orders o
  where upper(trim(o.client_order_id)) = upper(trim(p_order_number))
    and right(regexp_replace(o.customer_phone, '\D', '', 'g'), 4) = regexp_replace(p_phone_last4, '\D', '', 'g')
  limit 1;
end;
$$;
revoke all on function public.get_public_order_status(text,text) from public;
grant execute on function public.get_public_order_status(text,text) to anon, authenticated;

-- Database invariants for current production fields.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='orders_confirmation_email_status_check') then
    alter table public.orders add constraint orders_confirmation_email_status_check
      check (confirmation_email_status in ('pending','sent','failed')) not valid;
  end if;
end $$;
alter table public.orders validate constraint orders_confirmation_email_status_check;

-- Required by create-order idempotency. The partial unique index makes a
-- repeated checkout_request_id resolve to the original order instead of
-- creating a duplicate.
create unique index if not exists orders_checkout_request_id_uidx
  on public.orders(checkout_request_id)
  where checkout_request_id is not null;

create index if not exists orders_customer_phone_created_idx
  on public.orders(customer_phone, created_at desc);
create index if not exists orders_customer_user_created_idx
  on public.orders(customer_user_id, created_at desc)
  where customer_user_id is not null;

commit;
