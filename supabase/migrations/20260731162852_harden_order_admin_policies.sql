-- Consolidate legacy and current admin policies into one policy per action.
-- Apply in a development branch first, then verify admin read/update/delete.

drop policy if exists "Admin can read orders" on public.orders;
drop policy if exists "Admin can update orders" on public.orders;
drop policy if exists "Admin can delete orders" on public.orders;
drop policy if exists "Admins can read orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
drop policy if exists "Admins can delete orders" on public.orders;

create policy "Admins can read orders"
on public.orders
for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can update orders"
on public.orders
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete orders"
on public.orders
for delete
to authenticated
using ((select public.is_admin()));

