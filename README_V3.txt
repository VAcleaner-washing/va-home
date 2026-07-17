VA HOME v3 — Supabase reviews and orders

ACTIVE NOW:
- Approved reviews load from public.reviews.
- Review form inserts pending reviews.
- Average rating appears on product pages and dynamic product cards.
- RLS keeps pending/rejected reviews hidden.

TO ENABLE ORDER STORAGE:
1. Open Supabase SQL Editor.
2. Run SUPABASE_SETUP_ORDERS.sql once.
3. Upload the site files to GitHub.
Telegram checkout remains unchanged; orders are saved in parallel.

MODERATION:
Table Editor -> reviews -> change status from pending to approved.
Set verified_purchase=true only after checking the order.
