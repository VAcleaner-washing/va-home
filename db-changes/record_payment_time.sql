create or replace function public.record_noncard_payment_time()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.payment_method <> 'card_online' and new.payment_status = 'paid' then
    if TG_OP = 'INSERT' then
      new.paid_at := coalesce(new.paid_at, now());
    elsif old.payment_status is distinct from 'paid' then
      new.paid_at := coalesce(new.paid_at, now());
    else
      new.paid_at := old.paid_at;
    end if;
  end if;
  return new;
end;
$$;

create trigger record_noncard_payment_time_trigger
before insert or update on public.orders
for each row execute function public.record_noncard_payment_time();
