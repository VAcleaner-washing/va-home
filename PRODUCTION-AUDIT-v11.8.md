# VA HOME v11.8 — Production Audit

## Correct base
This release is based on `VA-HOME-v11.7-SEO-LAUNCH-AUDIT`.
Only the `supabase/functions` directory was taken from the current GitHub archive. A byte-level comparison showed that the five GitHub Edge Functions were identical to those already present in v11.7 before hardening.

## Audited
- cart and checkout
- customer account, Auth, wishlist and order history
- admin order/review workflows
- public order tracking
- Supabase Edge Functions
- RLS/RPC requirements visible from frontend and function code
- JavaScript syntax and local file references

## Hardening included
- verified-account order claiming and user-id-only customer read policy (SQL migration)
- malformed public order-status probes rejected in the RPC (SQL migration)
- idempotency request IDs validated; reused IDs must match the same customer, cart and amount
- safe browser fallback for UUID/sessionStorage
- explicit checkout rate-limit message
- account support for `awaiting_payment`
- review upload limited to 2 MB with file-signature checks
- `REVIEW_RATE_LIMIT_SECRET` is mandatory
- Nova Poshta lookup responses use `no-store`

## Deployment order
1. Run `SUPABASE_MIGRATION_V11_8_PRODUCTION_HARDENING.sql` after the existing project migrations.
2. Confirm secrets: `RESEND_API_KEY`, `NOVA_POSHTA_API_KEY`, `REVIEW_RATE_LIMIT_SECRET`.
3. Redeploy `create-order`, `nova-poshta-locations`, `submit-review`, and `send-status-email`.
4. Deploy the v11.8 website files.
5. Make one low-value real test order and verify database row, emails, account claim, status update email, public tracking and review moderation.

## Limitation
This is a static production audit. Live RLS state, deployed secrets, Resend delivery and Nova Poshta responses can only be confirmed after deployment with a real end-to-end test.
