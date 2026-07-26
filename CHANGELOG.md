# VA HOME changelog

## 13.8.1 — Premium Account Experience
- Цілісний premium-редизайн особистого кабінету.
- Блок «Ваш аромат зараз» із рекомендованим циклом 8–12 тижнів.
- Швидке повторення замовлення, статуси та ТТН у картці.
- Оновлені картки замовлень, порожні стани, профіль і mobile UX.
- Без змін Supabase-схеми та checkout-логіки.

## 13.8.0 — 2026-07-26

Safe technical cleanup based on RC36.

- Historical RC notes moved to `docs/releases/`; nothing was deleted.
- Local CSS/JS cache versions normalized to `13.8.0`.
- Service worker cache version updated to `13.8.0`.
- Checkout, Supabase, Edge Functions, authentication, Nova Poshta, PWA routing, SEO and promo-code logic were not refactored.
- Intentional output in `validate-product-story.js` was preserved because it is a developer validation utility, not production debug logging.