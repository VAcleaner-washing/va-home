# VA HOME Admin PWA 1.0

## Встановлення
1. Завантажте весь вміст архіву на GitHub Pages.
2. Відкрийте `https://vahome.com.ua/admin/`.
3. У Chrome/Android оберіть «Встановити застосунок». На iPhone: «Поділитися» → «На початковий екран».
4. Якщо раніше була встановлена загальна VA HOME PWA для адмінки, видаліть старий ярлик і встановіть адмінку заново.

## Архітектура
- Manifest: `/admin/manifest.webmanifest`
- Service Worker: `/admin/service-worker.js`
- Scope: `/admin/`
- Окремий кеш: `vahome-admin-*`
- Supabase, авторизація, замовлення та інші приватні відповіді не кешуються.

Supabase, SQL і Edge Functions повторно розгортати не потрібно.
