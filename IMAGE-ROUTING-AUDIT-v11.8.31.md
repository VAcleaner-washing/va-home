# VA HOME — IMAGE ROUTING AUDIT v11.8.31

## Що перевірено

- CSS `background` і `background-image` у всіх стилях.
- Hero-зображення інформаційних сторінок.
- HTML `<img>`, `src`, `poster` і preload.
- JS-маршрутизація footer-зображень.
- Фактична наявність WebP-файлів.
- Повністю однакові файли за SHA-256.

## Виправлено

1. **Catalog hero:** обидва CSS-правила тепер ведуть тільки на `images/pages/catalog-hero.webp`.
2. **About hero:** старі резервні правила більше не можуть підмінити нове фото файлами `images/home/about.webp` або `images/atmosphere/textile-calm.webp`; усі вони ведуть на `images/pages/about-hero.webp`.
3. **Collections legacy fallback:** старий клас `.collections-premium-hero` більше не підтягує `images/collections/noir.webp`; він веде на `images/pages/collections-hero.webp`.
4. **Footer Home:** усунено точний файловий дублікат із `product-story/pure-imagination/interior.webp`; встановлено окреме унікальне фото `images/pages/footer-home.webp`.

## Перевірена карта великих фото

| Сторінка / блок | Файл |
|---|---|
| Каталог | `images/pages/catalog-hero.webp` |
| Колекції | `images/pages/collections-hero.webp` |
| Про VA HOME | `images/pages/about-hero.webp` |
| Підбір аромату | `images/pages/scent-guide-hero.webp` |
| Discovery Set | `images/pages/discovery-hero.webp` |
| Journal | `images/pages/journal-hero.webp` |
| Доставка | `images/inner-pages/delivery-hero.webp` |
| Контакти | `images/inner-pages/contacts-hero.webp` |
| Footer головної | `images/pages/footer-home.webp` |
| Footer каталогу | `images/pages/footer-catalog.webp` |
| Footer колекцій | `images/pages/footer-collections.webp` |
| Footer Discovery | `images/pages/footer-discovery.webp` |
| Footer підбору | `images/pages/footer-scent-guide.webp` |
| Footer про бренд | `images/pages/footer-about.webp` |
| Footer доставки | `images/pages/footer-delivery.webp` |
| Footer контактів | `images/pages/footer-contacts.webp` |
| Footer товарних сторінок | `images/pages/footer-product.webp` |

## Результат

Конфліктів, за яких більш специфічне CSS-правило підміняє hero іншою колекцією, більше не виявлено. Великі сторінкові фото мають однозначні маршрути. Точних дублікатів серед растрових файлів після виправлення не виявлено.

## Окреме зауваження

У `js/products.js` залишаються майбутні шляхи `images/product-gallery/<аромат>/macro-1.webp` і `detail-1.webp`, для яких файли ще не додані. Це не CSS-підміна hero, а незаповнені слоти майбутніх галерей. Їх не замінено чужими фото, щоб не створювати нові дублювання.
