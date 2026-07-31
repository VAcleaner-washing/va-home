# VA HOME Supabase production baseline

Captured: 2026-07-31  
Project: `yweluzclearwrazdkahu`  
Storefront release: `15.1.1`

This file records the verified production state. It is a baseline and audit
artifact, not a migration to apply. Historic remote-only migrations are not
recreated with guessed SQL. Their exact production presence is recorded in
`production-migrations.json`.

## Public tables and RLS

All 15 public tables have Row Level Security enabled.

| Table | Columns | Policies |
| --- | ---: | ---: |
| admin_users | 3 | 1 |
| automation_secrets | 4 | 0 |
| discovery_credits | 12 | 2 |
| marketing_preferences | 8 | 1 |
| order_status_rate_limits | 4 | 0 |
| orders | 32 | 6 |
| private_releases | 12 | 3 |
| promo_codes | 18 | 2 |
| promo_redemptions | 7 | 1 |
| repeat_purchase_campaigns | 13 | 1 |
| repeat_purchase_test_runs | 10 | 1 |
| reviews | 12 | 9 |
| user_scent_profiles | 9 | 5 |
| welcome_credits | 11 | 1 |
| wishlists | 4 | 3 |

Tables with zero public policies are intentionally service-only:
`automation_secrets` and `order_status_rate_limits`.

## Public functions and execute scope

| Function | Security | Allowed application roles |
| --- | --- | --- |
| atomic_promo_redemption_guard() | definer | service_role |
| claim_customer_orders() | definer | authenticated, service_role |
| consume_order_status_rate_limit(text) | definer | service_role |
| create_order_atomic(jsonb, numeric, text) | definer | service_role |
| enforce_welcome_credit_first_purchase() | invoker | service_role |
| get_public_order_status(text, text) | definer | service_role |
| is_admin() | definer | authenticated, service_role |
| issue_discovery_credit_for_order(bigint) | definer | service_role |
| issue_discovery_credit_trigger() | definer | service_role |
| mark_personal_credit_used() | definer | service_role |
| schedule_repeat_purchase_campaign() | definer | service_role |
| set_order_timestamps() | invoker | trigger function |

The public order-status database function is not executable by `anon` or
`authenticated`; the storefront reaches it only through the rate-limited
`order-status` Edge Function.

## Release rule from 15.1 onward

1. Create a timestamped SQL migration locally.
2. Review RLS, grants, `SECURITY DEFINER`, ownership checks and exposed schema.
3. Apply to a development branch or controlled project first.
4. Run functional tests and database advisors.
5. Apply the reviewed migration to production.
6. Append the resulting remote version to `production-migrations.json`.
7. Regenerate this baseline with `schema-introspection.sql`.

Direct Dashboard edits must be treated as drift and captured in a migration
before the next storefront release.
