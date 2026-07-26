# RC23 — публікація Supabase Functions

Перед завантаженням сайту в production потрібно опублікувати дві функції з цього архіву:

1. `supabase/functions/nova-poshta-locations/index.ts`
2. `supabase/functions/create-order/index.ts`

Через Supabase CLI:

```bash
supabase functions deploy nova-poshta-locations --no-verify-jwt
supabase functions deploy create-order --no-verify-jwt
```

Після публікації перевірити три сценарії:

- населений пункт з одним відділенням — воно підставляється автоматично;
- населений пункт з багатьма відділеннями — працює пошук за номером або адресою;
- кур’єрська доставка на адресу.

Без оновлення цих функцій кур’єрська форма буде відхилятися старою серверною перевіркою.
