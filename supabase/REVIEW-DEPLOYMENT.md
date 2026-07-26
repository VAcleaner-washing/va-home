# VA HOME — deployment of reviews with photos

The review photo limit is configured in **three places** and all three must remain at 10 MB:

1. `js/reviews.js` — client validation.
2. `supabase/functions/submit-review/index.ts` — server validation.
3. `storage.buckets.review-photos.file_size_limit` — Supabase Storage.

## Local consistency check

```bash
node scripts/verify-review-photo-config.mjs
```

Run this before every release. It fails if the client, Edge Function or Storage migration no longer use the same 10 MB limit.

## Recommended deployment

From the project root with the Supabase CLI linked to the production project:

```bash
supabase db push
supabase functions deploy submit-review --no-verify-jwt
```

The migration `20260726_review_photo_storage_10mb.sql` is idempotent. It creates the bucket if missing and restores the 10 MB limit and allowed MIME types if somebody changes them later.

The Edge Function also performs a server-side bucket preflight before the first photo upload in each warm runtime instance and retries one failed upload after repairing the bucket configuration. This is a fallback; the migration remains the source of truth.

## Manual verification in Supabase SQL Editor

```sql
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'review-photos';
```

Expected:

- `public = true`
- `file_size_limit = 10485760`
- `allowed_mime_types = {image/jpeg,image/png,image/webp}`

## Edge Function configuration

`submit-review` remains public (`verify_jwt = false`) because anonymous customers may submit reviews. The function performs its own origin, payload, MIME, rate-limit and size validation. The service-role key is read only inside the Edge runtime and is never sent to the browser.
