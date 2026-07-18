# VA HOME — Google Search Console і GA4

## 1. Google Search Console

1. Відкрийте Google Search Console і додайте ресурс типу **Domain**: `vahome.com.ua`.
2. Google покаже TXT-запис. Додайте його в DNS домену без змін.
3. Після підтвердження відкрийте **Sitemaps** і надішліть:
   `https://vahome.com.ua/sitemap.xml`
4. Через **URL Inspection** перевірте головну, каталог, Discovery Set і 3–4 сторінки товарів та натисніть запит індексації.

DNS-підтвердження рекомендоване: воно охоплює і `www`, і основний домен та не потребує вставляти verification-код у кожний реліз сайту.

## 2. Google Analytics 4

1. Створіть ресурс GA4 та Web data stream для `https://vahome.com.ua`.
2. Скопіюйте Measurement ID у форматі `G-XXXXXXXXXX`.
3. У `js/config.js` знайдіть `ga4MeasurementId` і вставте ID між лапками.
4. Завантажте файл на GitHub і відкрийте сайт.
5. У GA4 → Realtime перевірте власний візит.
6. У DebugView/Realtime перевірте події:
   - `view_item`
   - `add_to_cart`
   - `remove_from_cart`
   - `view_cart`
   - `begin_checkout`
   - `purchase`
   - `discovery_set_complete`

Аналітика не передає ім’я, телефон, email, адресу доставки чи коментар покупця.

## 3. Важливо

Поки `ga4MeasurementId` порожній, Google Analytics повністю вимкнена і зовнішній скрипт Google не завантажується.
