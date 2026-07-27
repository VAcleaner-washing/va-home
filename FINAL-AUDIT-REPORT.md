# VA HOME v13.8.32 — Final Audit

This release fixes three customer-visible issues without changing the product architecture or the stable composition block geometry.

## Fixed

- The homepage review showcase keeps its server-rendered cards visible while current Supabase photos preload. The grid updates only after usable images are ready, preventing a loaded review card from becoming a black placeholder.
- The first two large review images use eager, high-priority loading.
- Hotel Spring is now included in the `floral` character group. The “Квіткові” catalog filter returns Evening Ritual and Hotel Spring.
- Scent-guide recommendations display “Чому підходить”, “Палички” and “Догляд” as three separate rows instead of one dense paragraph.

## Preserved

- all 18 approved “Задум композиції” texts from v13.8.31;
- exact v13.8.27 composition-block geometry;
- six-axis fragrance DNA and Warmth;
- central product data and scent-guide scoring;
- individual reed setup and care disclosure;
- authenticated checkout email prefill;
- v13.8.17 stable product gallery baseline.

## Validated

- 53 HTML pages and 18 product pages;
- all 1,728 scent-guide answer profiles;
- central product JSON and generated `js/products.js` synchronization;
- Floral filter contains at least two relevant products and includes Hotel Spring;
- separated recommendation rows exist in JavaScript and CSS;
- homepage review preloading and stable fallback are present;
- JavaScript/MJS syntax, PWA versions, local assets and ZIP integrity.
