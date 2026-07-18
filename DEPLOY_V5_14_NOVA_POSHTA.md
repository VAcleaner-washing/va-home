# VA HOME v5.14 — Nova Poshta Checkout

## Перед завантаженням сайту

1. Отримайте API-ключ у кабінеті Нової пошти.
2. У Supabase відкрийте **Edge Functions → Secrets**.
3. Додайте секрет `NOVA_POSHTA_API_KEY`. Не вставляйте цей ключ у `config.js`, GitHub або браузерний JavaScript.
4. У SQL Editor один раз виконайте `SUPABASE_MIGRATION_V5_14_NOVA_POSHTA.sql`.

## Edge Functions

Розгорніть дві функції з актуального архіву:

- `nova-poshta-locations` із `supabase/functions/nova-poshta-locations/index.ts`;
- `create-order` із `supabase/functions/create-order/index.ts`.

Для `nova-poshta-locations` вимкніть **Verify JWT with legacy secret**: функція викликається публічним checkout і самостійно обмежує дозволені домени та типи запитів. Для `create-order` залиште поточне публічне налаштування checkout.

## Завантаження сайту

Після SQL і функцій завантажте всі файли v5.14 на GitHub із заміною попередньої версії.

## Перевірка

1. Відкрийте кошик у приватному вікні браузера.
2. Введіть 2–3 літери назви міста й оберіть його зі списку.
3. Введіть номер або частину адреси відділення й оберіть результат.
4. Оформіть тестове замовлення.
5. В адмінці перевірте місто та повну адресу доставки.
6. У таблиці `orders` перевірте заповнення `nova_poshta_city_ref` та `nova_poshta_warehouse_ref`.

Якщо API Нової пошти тимчасово недоступний, checkout автоматично дозволяє ручний ввід, щоб не блокувати продаж.
