# Repeat purchase email deployment

Release: VA HOME v13.8.35

## Defaults

- Trigger: 55 days after order status becomes `completed`.
- Offer: fixed 100 UAH discount.
- Validity: 7 days.
- Eligibility: full-size fragrance products only.
- Discovery Set: excluded.
- Promo: one-time and bound to the recipient email.

## Components

1. Apply `supabase/migrations/20260727_repeat_purchase_email_campaign.sql`.
2. Deploy `create-order` with JWT verification disabled, preserving its public server validation.
3. Deploy `validate-promo` with JWT verification disabled.
4. Deploy `process-repeat-purchase` with JWT verification disabled; it enforces its own cron/admin authentication.
5. Deploy `marketing-unsubscribe` with JWT verification disabled.

Existing orders are not opted in automatically. Only orders created with explicit marketing consent can enter the campaign.
