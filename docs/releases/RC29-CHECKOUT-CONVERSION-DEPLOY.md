# VA HOME RC29 — checkout conversion update

## GitHub
Upload all files from this archive to the site repository.

## Supabase
Deploy the updated Edge Function `supabase/functions/create-order/index.ts`. This is required for server-side promo code validation, the 100 грн discount for promo code `test`, and the “do not call” preference in order notes/emails.

The `nova-poshta-locations` function does not need to be redeployed if the RC23 version is already live.

## Shipping rule used
- Branch or parcel locker: free from 1500 грн.
- Courier: always charged according to Nova Poshta tariffs.
- Free-shipping progress is calculated from the product subtotal before promo discount.
