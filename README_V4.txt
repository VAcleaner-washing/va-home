VA HOME v4 — checkout without Telegram

1. Run SUPABASE_MIGRATION_V4.sql in Supabase SQL Editor.
2. Upload all site files to GitHub Pages.
3. Test an order: it must appear in Table Editor > orders and redirect to thank-you.html.

EMAILS (optional final activation):
- Create a Resend account and verify vahome.com.ua.
- Create RESEND_API_KEY.
- In Supabase > Edge Functions create send-order-email and paste supabase/functions/send-order-email/index.ts.
- Add the RESEND_API_KEY secret and deploy.

Until the email function is deployed, checkout still works and orders are saved; only emails are skipped.
