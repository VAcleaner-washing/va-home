-- VA HOME v5.12 — one review invitation per completed order.
-- Run once in Supabase SQL Editor before deploying the updated
-- send-status-email Edge Function.

alter table public.orders
  add column if not exists review_invitation_sent_at timestamptz;

comment on column public.orders.review_invitation_sent_at is
  'Set by send-status-email after the completed-order review invitation is accepted by the email provider.';

create index if not exists orders_review_invitation_pending_idx
  on public.orders(status, review_invitation_sent_at)
  where status = 'completed' and review_invitation_sent_at is null;
