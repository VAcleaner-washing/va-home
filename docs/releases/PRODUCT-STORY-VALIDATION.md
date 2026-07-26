# VA HOME — Product Story Validation

Запуск із кореня проєкту:

```bash
node validate-product-story.js
```

Код завершення:

- `0` — структура повна;
- `1` — реліз заблоковано через відсутні або неправильно названі файли.

Перевіряється:

- 18 товарних HTML-сторінок;
- відповідність папок `images/product-story/<slug>/`;
- наявність `hero.webp`, `macro.webp`, `interior.webp`, `detail.webp`, `atmosphere.webp`, `top.webp`, `heart.webp`, `base.webp`;
- тільки lowercase у назвах;
- відсутність PNG/JPG/JPEG у product-story;
- усі посилання з товарних HTML на реальні файли.
