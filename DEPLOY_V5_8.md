# VA HOME v5.8 — Reviews Integrity + Product SEO

## 1. Website

Upload the complete release to GitHub and wait for the production deployment.

## 2. Supabase SQL

Open **SQL Editor**, paste the full contents of:

`SUPABASE_MIGRATION_V5_8_REVIEWS_SEO.sql`

Run it once. A repeated run is safe.

## 3. Edge Function

Redeploy the existing `submit-review` function from:

`supabase/functions/submit-review/index.ts`

Keep **Verify JWT with legacy secret** switched **OFF**. The function validates an optional customer session itself and still accepts moderated guest reviews.

Required secrets remain:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `REVIEW_RATE_LIMIT_SECRET`

## 4. Verification

1. A guest review must be saved as `pending` and never marked verified.
2. A signed-in customer with a confirmed email and a paid/shipped/completed order containing the aroma must receive `verified_purchase = true`.
3. A second active review by the same customer for the same aroma must return HTTP 409.
4. Admin moderation may update `status`; browser clients cannot set `verified_purchase`.
5. Validate one product URL in Google Rich Results Test after deployment.

## SEO included

- unique descriptions based on the actual scent data for all 18 products;
- `index,follow,max-image-preview:large`;
- Ukrainian and x-default alternate URLs;
- Open Graph locale, site name and product price;
- expanded Product schema with canonical URL, category, seller, volume and intensity;
- high-priority decoding for the main product image.
