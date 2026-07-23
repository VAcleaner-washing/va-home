# VA HOME — автоматична система фотографій товарів

## Куди завантажувати

Для кожного аромату використовується окрема папка:

`images/product-gallery/назва-аромату/`

Наприклад:

`images/product-gallery/signature-relax/`

## Як називати файли

Основне фото:

- `hero.webp`

Додаткові фотографії:

- `interior-1.webp`, `interior-2.webp`, `interior-3.webp`…
- `macro-1.webp`, `macro-2.webp`, `macro-3.webp`…
- `detail-1.webp`, `detail-2.webp`, `detail-3.webp`…

Система автоматично перевіряє до 12 файлів кожного типу й показує тільки ті, які реально існують. Редагувати `js/products.js` після додавання фотографій не потрібно.

## Порядок у галереї

1. `hero.webp`
2. `interior-1.webp`, `interior-2.webp`…
3. `macro-1.webp`, `macro-2.webp`…
4. `detail-1.webp`, `detail-2.webp`…

## Як відбувається перехід

- Поки `hero.webp` у новій папці відсутній, сайт використовує старі фотографії з `images/products/` та `images/atmosphere/`.
- Щойно в папці аромату з’являється `hero.webp`, галерея автоматично переходить на нову папку.
- Відсутні номери не створюють битих слайдів: наприклад, можна мати `interior-1.webp` і `interior-3.webp` без `interior-2.webp`.
- Старі файли варто видаляти лише після перевірки всіх 18 нових галерей.

## Вимоги до фото

- формат: WebP;
- пропорція: 4:5;
- рекомендований розмір: 1400 × 1750 px;
- назви малими латинськими літерами;
- без пробілів, дужок і кирилиці.

## Папки ароматів

- `signature-relax/`
- `forbidden-fruit/`
- `doux-moment/`
- `wild-berry-way/`
- `hotel-spring/`
- `evening-ritual/`
- `velvet-spa/`
- `pure-zen/`
- `hotel-luxe/`
- `old-money/`
- `linstinct/`
- `mineral-salt/`
- `pure-imagination/`
- `silk-molecule/`
- `the-archive/`
- `silent-temple/`
- `moss-and-shadow/`
- `dark-bloom/`

---

## New unified v9.2 product-story system

For all new product content, use `images/product-story/<product-id>/` and the nine exact filenames documented in `PRODUCT-STORY-PHOTO-GUIDE.md`.
The older `images/product-gallery/` structure remains supported only for backward compatibility.
