# VA HOME RC31.1 — розгортання промокодів

## 1. Оновлення сайту

Завантажте на GitHub **увесь вміст архіву**, включно з папками `admin`, `js`, `css` і `supabase`.

## 2. SQL у Supabase

Відкрийте:

**Supabase → SQL Editor → New query**

Скопіюйте та виконайте повний файл:

`supabase/migrations/20260726_promo_codes.sql`

Ця версія виправляє несумісність типів: `orders.id` і `promo_redemptions.order_id` тепер обидва мають тип `bigint`. Міграцію можна запускати повторно, навіть якщо попередній запуск завершився помилкою.

Після успішного виконання в **Table Editor** мають з’явитися:

- `promo_codes`
- `promo_redemptions`

У `promo_codes` автоматично створиться код `TEST` зі знижкою 100 грн.

## 3. Edge Functions

Повторно розгорніть:

- `validate-promo`
- `create-order`

Через Supabase CLI:

```bash
supabase functions deploy validate-promo
supabase functions deploy create-order
```

## 4. Перевірка

1. Відкрийте `/admin/` → **Промокоди**.
2. Переконайтеся, що видно код `TEST`.
3. Додайте повноцінний аромадифузор у кошик.
4. Введіть `TEST` — сума повинна зменшитися на 100 грн.
5. Оформіть тестове замовлення та перевірте запис у `promo_redemptions`.
