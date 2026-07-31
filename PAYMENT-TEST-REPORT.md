# VA HOME v15.2.0 — Payment Test Report

Дата: 2026-07-31

## Production backend

- monobank secret detected by server: PASS
- payment feature flag enabled: PASS
- `payment-config`: enabled=true, configured=true: PASS
- invalid webhook signature rejected with HTTP 401: PASS
- malformed `create-order` rejected with HTTP 400: PASS
- malformed `card-payment` rejected with HTTP 400: PASS
- payment RPC: anon EXECUTE=false: PASS
- payment RPC: authenticated EXECUTE=false: PASS
- payment RPC: service_role EXECUTE=true: PASS
- migration and RLS deployment: PASS
- Edge Functions ACTIVE: PASS

## Static release

- no acquiring token in HTML/JS/archive: PASS
- browser has no direct monobank API call: PASS
- card option is server-feature-gated: PASS
- bank transfer and cash on delivery preserved: PASS
- thank-you status reconciliation and retry: PASS
- authenticated account retry: PASS
- card status locked in admin: PASS
- JavaScript/TypeScript syntax: PASS
- complete `npm run verify`: PASS

## Control payment

A real paid transaction was not created automatically, so no customer funds or merchant dashboard records were touched. After uploading this archive, the owner should make one ordinary control purchase and verify the full bank redirect → webhook → paid flow.
