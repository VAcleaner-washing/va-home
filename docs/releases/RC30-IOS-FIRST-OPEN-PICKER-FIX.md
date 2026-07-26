# RC30 — iOS first-open Nova Poshta picker fix

- Locks the checkout page before the mobile picker opens.
- Sizes and positions the picker from `window.visualViewport`.
- Re-syncs after the iOS keyboard opens or changes height.
- Restores the exact checkout scroll position after selection or close.
- No Supabase redeploy is required after RC29.
