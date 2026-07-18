# VA HOME v5.9 — Stable Account + Wishlist

Upload the complete release to GitHub. No new SQL migration or Edge Function deployment is required after v5.8.

## Production check

1. Open `account.html` while signed out: only the login form must appear.
2. Sign in: the button must never remain on “Входимо…” for more than 12 seconds.
3. Refresh while signed in: only the dashboard must appear.
4. Add and remove a wishlist item from both catalog/product pages and the account.
5. Repeat a normal product order and a selected-six Discovery Set order; verify the cart contents.
6. Sign out and refresh: the private dashboard must not remain visible.

## Included safeguards

- deferred Supabase SDK so it cannot block initial page rendering;
- explicit SDK/network/session failure states;
- 12-second timeout for auth, orders, wishlist, password reset and logout;
- deduplicated dashboard loading after auth events;
- live wishlist synchronization events;
- no checkout or order-creation changes.
