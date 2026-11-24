# Evidence & Verification Boundaries — public edition

Аудит 2026-11-24 UTC; підготовка public edition — окремий confidentiality pass. Подальша публікація документації не означає повторний production audit. Public references: [repository](https://github.com/VAcleaner-washing/va-home), [PR #1](https://github.com/VAcleaner-washing/va-home/pull/1), публічні сторінки VA HOME. Внутрішні адреси, infrastructure IDs, query results, production security settings та payment implementation evidence не публікуються.

| ID | Метод / джерело | Висновок та межі |
|---|---|---|
| E01 | Git history, source tree та review PR #1 | static storefront, admin PWA, backend sources і п'ять Node test files; package.json та repository regression workflows не знайдено на audited main |
| E02 | Read-only hosting metadata та GET public release/pages/service workers | frontend deployment — GitHub Pages main; inspected HTML/release/service-worker files збігалися з audited source; release 16.4.18. Це не повна атестація всіх assets або installed PWA |
| E03 | Node v24.22.3, `node --test *.test.cjs` | exit 0, п'ять file-level results; це саме по собі не доказ кількості named scenarios |
| E04 | Додаткове пряме виконання всіх наявних test files | 19 named tests passed, 0 failed. Experimental runtime warning зафіксований; test sources не змінювалися |
| E05 | Read-only backend metadata та source review | control mechanisms присутні; повна reproducibility, isolation та payment-recovery verification не завершені. Чутливі подробиці виключені |
| E06 | Frontend/admin/data-flow review | catalog/checkout/order/account/Discovery/finance/analytics flows є; ownership та measurement gaps наведені в assessment |
| E07 | Anonymous Chromium smoke на 390×844 та 1440×1000 | home/catalog/empty cart/admin login: 8 observations, no observed horizontal overflow/pageerror. Backend traffic і non-GET blocked; authenticated/product-purchase flows не виконувалися |
| E08 | Візуальний review та CSS/source inspection | існуюча warm dark/gold identity, shared tokens, responsive assets; повний a11y/CWV baseline не виміряний |

Початковий browser smoke мав environment certificate trust error. Повторний rendering run допускав environment certificate bypass, тому результат не є TLS certification. Browser/DOM mocks не підміняють банківську звірку, database integration або real-device test.

## Окремі статуси

- Self-review: виконано для аудиту та public edition.
- Security & Confidentiality Review: виконано як self-review, деталі процесу — в окремому документі.
- Independent Review: не виконано; наступний етап.
- Local regression QA: 19/19 named scenarios під час первинного аудиту; це mocks/VM, а не live integration.
- CI: hosting build перевірявся; repository regression CI не встановлений аудитом.
- Production: read-only provenance та обмежений anonymous rendering; production writes і real payments не виконувалися.
- Physical devices / authenticated E2E / bank sandbox: не виконано.
- GA4/GSC/ad dashboards, field CWV, business ROI, restore drill: не перевірено.

Невідомі значення не трактуються як нуль, неуспішні перевірки не приховані. Повний evidence package збережено локально й не включено до git export. Review публічної історії обмежено новими комітами та їх reachable additions порівняно з поточним main; existing main history не переписується.
