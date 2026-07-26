# RC28 — Mobile Chrome full-screen Nova Poshta picker fix

- Mobile Chrome no longer depends on a `focus` event from the readonly checkout field.
- A tap directly launches the full-screen city or warehouse picker.
- Clicks inside the picker no longer trigger the global outside-click closer.
- Mobile/PWA detection includes narrow touch devices up to 900 px.
- Checkout CSS/JS cache-busting and the service-worker version are updated to RC28.
- No Supabase redeploy is required after RC22/RC23 functions are already live.
