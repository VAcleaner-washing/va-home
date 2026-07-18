# VA HOME v5.16.2 — відновлення checkout

1. У Supabase → SQL Editor виконайте `SUPABASE_MIGRATION_V5_16_CHECKOUT_REPAIR.sql`. У результаті всі 8 рядків мають показати `present = true`.
2. Повторно розгорніть `supabase/functions/create-order/index.ts` як Edge Function `create-order`.
3. У Settings функції `create-order` залиште **Verify JWT with legacy secret = OFF** і збережіть.
4. Перевірте Secrets: `NOVA_POSHTA_API_KEY` має бути доданий; `SUPABASE_SERVICE_ROLE_KEY` і `SUPABASE_URL` надаються проєктом Supabase.
5. Завантажте файли сайту з архіву на GitHub із заміною старих.
6. Відкрийте `https://vahome.com.ua/cart.html` у приватному вікні та оформіть тестове замовлення.
7. Якщо помилка повториться, скопіюйте показаний на сторінці `Код звернення` та знайдіть його в Edge Functions → create-order → Logs.

Кошик не очищається при помилці. Повторна спроба має той самий `checkout_request_id`, тому не створює дубль. Прямий небезпечний запис замовлення з браузера не вмикається.
