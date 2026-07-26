# v13.8.8 — Admin Mobile Dialogs Fix

- Діалоги замовлення та промокоду зафіксовані точно по ширині екрана телефона.
- Додані safe-area відступи для iPhone PWA: заголовки й кнопки більше не заходять під статус-бар.
- Верх форми промокоду став компактнішим і преміальнішим.
- Довгі ID, email, адреси та назви товарів більше не створюють горизонтальний скрол.
- Нижні кнопки промокоду враховують home indicator.
- Версію окремого Admin PWA та його кеш оновлено до 13.8.8.

# v13.8.7 — Editorial Social Proof Reviews

- Головний блок відгуків перезібрано як editorial-галерею з максимум 5 реальних фото.
- На десктопі: 2 великі відгуки та 3 компактні картки в асиметричній композиції.
- На телефоні: одна картка 4:5 з видимим краєм наступної та свайпом по всіх 5 відгуках.
- Додано живі показники з Supabase: кількість відгуків, середня оцінка та підтверджені покупки.
- У добірці пріоритет мають підтверджені покупки й різні аромати.
- Текст займає не більше нижньої третини фотографії; зірки в картках не використовуються.
- Схему Supabase, Edge Functions, checkout та окремий Admin PWA не змінено.

# v13.8.6 — Five Editorial Reviews

- На головній відображається максимум 5 відгуків із фото.
- На десктопі всі 5 карток 4:5 вміщуються в один ряд.
- На телефоні доступні ті самі 5 відгуків у горизонтальному слайдері: одна велика картка та видимий край наступної.
- Навігація переміщується рівно на одну картку, індикатори відповідають п’яти відгукам.

# v13.8.3 — VA HOME Admin PWA 1.0

- Окремий manifest для `/admin/` із власними `id`, `start_url` та `scope`.
- Окремий Service Worker і незалежний кеш `vahome-admin-*`.
- Окремі іконки VA HOME Admin для iOS, Android і maskable-режиму.
- Офлайн-екран без кешування замовлень, авторизації або Supabase-відповідей.
- Сповіщення про нову версію з кнопкою «Оновити зараз».
- Швидкі дії PWA: замовлення, відгуки, промокоди.
- Адмінські CSS/JS cache-busters синхронізовано до `13.8.3`.

# VA HOME — Changelog

## 13.8.2 — Premium Account Rebuild
- Compact personal account header without the oversized hero banner.
- Product-first order cards with clear hierarchy, status, amount and actions.
- Correct expandable order details and Nova Poshta tracking action.
- Refined current-scent card with the 8–12 week cycle.
- Responsive desktop and mobile layouts plus skeleton loading.
- No Supabase, SQL or Edge Function changes.

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