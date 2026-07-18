# VA HOME v5.5 — порядок запуску

## Що змінено

- ціни, назви, сума та номер замовлення формуються сервером;
- прямий публічний insert у `orders` вимикається;
- email формується лише з перевірених сервером даних;
- старий небезпечний `send-order-email` закритий;
- український телефон нормалізується та перевіряється;
- checkout став коротшим і зрозумілішим;
- catalog використовує 3 колонки на середньому desktop;
- на товарі додані умови покупки, Discovery Set і mobile sticky CTA;
- у кабінеті додано повний reset-password flow;
- виправлено позиціонування badge Bestseller.

## Обов’язковий порядок

1. Завантажити файли сайту на GitHub.
2. У Supabase SQL Editor виконати `SUPABASE_MIGRATION_V5_5_SECURE_CHECKOUT.sql`.
3. Deploy Edge Function `create-order` з папки `supabase/functions/create-order`.
4. Повторно deploy `send-order-email` — нова версія закриває старий endpoint кодом 410.
5. Переконатися, що для `create-order` доступні secrets:
   - `SUPABASE_URL`;
   - `SUPABASE_SERVICE_ROLE_KEY`;
   - `RESEND_API_KEY`.
6. У Supabase Authentication → URL Configuration додати `https://vahome.com.ua/account.html` у Redirect URLs.
7. Зробити тестове замовлення з оплатою на рахунок і друге — при отриманні.

## Важливо

Не запускайте SQL-міграцію раніше, ніж готові одразу deploy `create-order`: міграція навмисно відключає старий прямий insert із браузера. Якщо виконати тільки SQL, а функцію не deploy, checkout не зможе створювати замовлення.

Nova Poshta API, еквайринг, GA4/Meta Pixel та юридичні реквізити не підключені, бо для них потрібні реальні ключі/акаунти/дані власника. Їх не можна замінювати вигаданими значеннями.
