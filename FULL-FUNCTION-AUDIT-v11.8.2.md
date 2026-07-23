# VA HOME v11.8.2 — Full Function Audit

Base: `VA-HOME-v11.8.1-HERO-SLIDER-FIX(1).zip`

## Audited areas

- Home hero carousel and motion layer
- Product catalogue, filters, product pages and gallery scripts
- Cart, quantities, checkout validation and saved draft
- Nova Poshta city/warehouse lookup
- Order creation and idempotency
- Thank-you and public order tracking
- Account authentication, order history and wishlist
- Admin order management and status email function
- Reviews, verified-purchase logic and photo upload
- Static SEO/HTML integrity and local resource references
- Supabase Edge Function syntax and deployment migration

## Confirmed fixes in v11.8.2

### 1. Review photos really support 5 MB
The browser already allowed 5 MB, but `submit-review` still contained an old base64-length guard equivalent to about 2 MB. This rejected larger phone photos before the decoded 5 MB check.

Fixed by using one shared `MAX_PHOTO_BYTES = 5 * 1024 * 1024` value and calculating the correct base64 character limit from it.

### 2. Hero automatic rotation
The carousel previously stopped whenever the desktop pointer was over the hero. Since the hero fills the first screen, this could look like automatic rotation was broken.

Pointer-hover pausing was removed. Rotation remains active every 7 seconds; tab visibility and keyboard interaction handling remain.

### 3. Duplicate checkout race
Two nearly simultaneous checkout submissions could race. One request created the order, while the other received a unique-key error and could show a false failure.

`create-order` now re-reads the existing order after an idempotency-key conflict, verifies customer/cart/total equality, and returns the original order safely.

### 4. Checkout double-submit lock
The page now locks checkout submission globally, including the mobile sticky action, while a request is active.

### 5. Database idempotency requirement
The deployment migration now creates a partial unique index on `orders.checkout_request_id`. This is required for reliable duplicate-order protection.

### 6. Legacy status compatibility
`pending` is now recognized consistently in the admin panel and status email function alongside the current `awaiting_payment` flow.

## Automated static checks

- HTML files checked: 39
- Missing local CSS/JS/image/link targets: 0
- Duplicate HTML IDs: 0
- Pages with invalid H1 count: 0
- Images without `alt`: 0
- Frontend JavaScript syntax errors: 0
- Edge Function TypeScript syntax errors: 0
- Remaining 2 MB review-photo guards: 0

## Deployment order

1. Back up the current Supabase database.
2. Run `SUPABASE_MIGRATION_V11_8_PRODUCTION_HARDENING.sql`.
3. Redeploy these Edge Functions:
   - `create-order`
   - `submit-review`
   - `nova-poshta-locations`
   - `send-status-email`
   - `send-order-email` (deprecated 410 stub)
4. Upload the website files to GitHub.
5. Clear browser/CDN cache and test the production domain.

## Required live smoke test

Static audit cannot prove external services are configured correctly. On the deployed site verify:

- hero rotates through 1 → 2 → 3 with text;
- cart add/remove/quantity/total;
- one real test order is written once;
- a rapid second click does not create a duplicate;
- customer and admin emails arrive;
- account login and order claiming work for a confirmed email;
- admin status update sends an email;
- review without photo works;
- JPG/WebP photo between 2 and 5 MB works;
- public order tracking returns only the matching order.

## Release status

This archive is a release candidate after the migration and Edge Functions are deployed. Final production approval depends on the live smoke test above.
