# VA HOME v15.2.0 — фінальний технічний аудит

## Результат

Реліз пройшов повну команду `npm run verify`.

- 71 HTML-сторінка;
- 18 товарних сторінок;
- 5 категорій;
- 26 матеріалів Journal;
- 18 ароматів у центральному каталозі;
- 1 728 профілів Scent Guide;
- локальні посилання, JSON-LD, sitemap та image sitemap — PASS;
- JavaScript, MJS і платіжні TypeScript Edge Functions — PASS;
- фото відгуків WebP 1600 px / 0.82 — PASS;
- Discovery Credit 150 / 250 / 450 грн — PASS;
- Welcome Credit 100 грн / 7 днів — PASS;
- Repeat Atmosphere, Room Ritual і Private Preview — PASS.

## Карткова оплата

- invoice створюється тільки сервером із серверної суми;
- `MONO_ACQUIRING_TOKEN` відсутній у статичному релізі;
- картковий спосіб з’являється лише після `payment-config`;
- webhook перевіряє `X-Sign`;
- сума, валюта та reference звіряються перед зарахуванням;
- застарілі та повторні webhook-події не змінюють оплату повторно;
- статус можна звірити після повернення з monobank;
- повторна оплата доступна на thank-you та в авторизованому кабінеті;
- картковий статус заблокований від ручного редагування в адмінці;
- платіжна RPC доступна лише `service_role`.

## Production Supabase

- `create-order` v29 — ACTIVE;
- `payment-config` v1 — ACTIVE;
- `mono-webhook` v2 — ACTIVE;
- `card-payment` v2 — ACTIVE;
- payment feature flag — ENABLED;
- monobank secret — CONFIGURED.

## Єдина ручна перевірка після заливання сайту

Зробити одне контрольне замовлення реальною карткою власника ФОП і перевірити редирект, повернення, webhook, лист та статус `paid`. Автоматично кошти не списувалися.
