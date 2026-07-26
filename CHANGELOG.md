## 13.8.16 — Final technical polish
- Синхронізовано cache-busters клієнтського сайту й окремого Admin PWA.
- Виправлено PWA shortcuts для статичних `.html` маршрутів.
- Додано CSP на сторінку порівняння.
- Старі Release Candidate meta-позначки замінено на `13.8.16 Stable`.
- Уніфіковано формулювання тривалості 8–12 тижнів і рекомендацію перевертати палички лише для короткочасного посилення.
- Додано HTML-fallback рейтингів і схвалених відгуків, а також `aggregateRating`/`review` у Product JSON-LD.
- На головній є статичний social-proof fallback, який працює до відповіді Supabase.
- Оновлено sitemap і додано фінальний автоматизований звіт перевірки.

## 13.8.15 — Review photo Storage hardening
- Added an idempotent migration that creates or repairs the public `review-photos` bucket.
- Fixed the bucket limit at 10 MB with JPG, PNG and WebP MIME restrictions.
- `submit-review` now performs a cached bucket preflight and retries one failed upload after repairing Storage settings.
- Added a specific `PHOTO_UPLOAD_FAILED` response and a useful client message instead of a misleading internet error.
- Added deployment and verification instructions so Storage, Edge Function and storefront limits remain synchronized.


## 13.8.14 — Review service reliability
- Fixed `submit-review` returning 503 after deployment when the optional rate-limit secret was absent.
- Added a server-only fallback secret without weakening rate limiting.
- Improved the client error message for temporary 502/503 responses.
- Kept the 10 MB original-quality photo limit and removable photo selection.

# VA HOME changelog

## 13.8.12 — Removable review photo
- Після вибору фото біля назви файлу з’являється окрема дія «Видалити».
- Видалення повністю очищає нативне поле файлу, тому відгук можна надіслати без фото.
- Кнопка залишається доступною навіть для завеликого або непідтримуваного зображення.
- Після видалення прибирається помилка, пов’язана з фото, але введений текст, ім’я та оцінка зберігаються.
- Мобільне компонування поля фото адаптоване під iPhone; Supabase та Edge Functions змінювати не потрібно.

# VA HOME changelog

## 13.8.11 — iPhone review photo optimisation
- Фото з iPhone/HEIC більше не відхиляється лише через збільшення розміру під час конвертації в JPEG.
- Перед надсиланням фото автоматично стискається до безпечного розміру та максимум 2200 px по довшій стороні.
- У полі вибору показується фактичний розмір файлу й позначка про оптимізацію.
- Серверний ліміт 5 МБ збережений; на сервер надходить уже оптимізований JPEG.
- Supabase, SQL та Edge Function змінювати не потрібно.

# v13.8.10 — Admin Orders First UX

- Виправлено хрестик у деталях замовлення: він тепер має окремий обробник і стабільно закриває діалог на iPhone/PWA.
- Головний екран адмінки трохи опущено нижче для комфортнішої safe-area композиції.
- Розділ «Замовлення» тепер відкривається одразу з пошуку, усіх статусів і списку замовлень.
- Аналітику винесено в окрему вкладку, щоб вона не заважала щоденній роботі.
- Додано всі шість статусів замовлень як швидкі фільтри.
- Мобільні вкладки зроблено горизонтально прокручуваними без ламання ширини.
- Кеш окремого Admin PWA оновлено до 13.8.10.

# v13.8.9 — Checkout Order Schema Fix

- Виправлено 500 під час оформлення замовлення після додавання промокодів.
- У `public.orders` додані поля `discount_amount` та `promo_code`, які вже використовує Edge Function `create-order`.
- Міграція безпечна для повторного запуску.
- Продакшн-база Supabase уже оновлена; повторно розгортати Edge Function не потрібно.

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