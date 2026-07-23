# VA HOME v11.8.11 — Priority fixes

## Виконано

1. Додано preload двох критичних кириличних WOFF2 на всі 39 HTML-сторінок:
   - Cormorant Garamond 500
   - Manrope 400
2. Прибрано production `console.warn` / `console.error` з 5 JS-файлів.
3. Прибрано глобальний `scroll-behavior: smooth` з `reset.css` і `motion.css`.
4. Перевірено Product JSON-LD на всіх 18 товарних сторінках. У кожній схемі вже присутні `offers.price`, `offers.priceCurrency` та `offers.availability`; змін не потребувало.

## Не змінювалося

- checkout / server-side pricing;
- Supabase / SQL / RLS;
- логіка замовлень;
- дизайн і фотографії;
- CSS-консолідація та motion timing — це окремий наступний етап.
