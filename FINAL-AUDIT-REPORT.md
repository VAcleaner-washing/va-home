# VA HOME v13.8.36 — Final Audit

This release adds an automated repeat-purchase email lifecycle on top of v13.8.34.

## Customer flow

- Marketing consent is a separate optional checkbox and is never required to place an order.
- A qualifying full-size fragrance order is scheduled 55 days after it reaches `completed`.
- The customer receives a personal 100 UAH promo code valid for 7 days.
- The code is single-use, bound to the recipient email, valid only for full-size fragrances and excluded from Discovery Set.
- Every campaign email contains one-click unsubscribe. Service order emails remain enabled.

## Backend

- New `marketing_preferences` and `repeat_purchase_campaigns` tables.
- New order timestamps and campaign status fields.
- New personal-promo metadata in `promo_codes`.
- New `process-repeat-purchase` and `marketing-unsubscribe` Edge Functions.
- Daily protected pg_cron job.
- Resend idempotency keys prevent duplicate delivery on retries.

## Preserved

- Product cards, Journal 01–21, product-to-Journal links, catalog filters, scent guide, six-axis DNA, gallery geometry, reed guidance, reviews, account flow and PWA behavior.
