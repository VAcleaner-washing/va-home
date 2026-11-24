# UX/UI & Design System Assessment — public edition

Докази E07–E08. Review anonymous public pages та admin login, без customer data й authenticated screens. Smoke: 390×844 і 1440×1000, без observed horizontal overflow/pageerror на home/catalog/empty cart/login. Повний populated checkout, screen reader, physical devices та authenticated states не перевірені.

## Brand foundation

Quiet luxury уже підтримується warm dark surfaces, ivory editorial headings, gold accents і предметною фотографією з теплим світлом. Storefront та login мають спільну візуальну мову. Рекомендація — зберегти premium minimalism, stone/marble atmosphere та amber reflections, розвиваючи наявну систему, а не робити generic redesign.

| Наявний елемент | Пропозиція |
|---|---|
| Shared CSS colors / semantic aliases | залишити canonical CSS source; перевірити contrast кожної фактичної пари |
| Cormorant Garamond + Manrope | editorial serif для заголовків; читабельний body та numeric data в admin |
| Fluid heading sizes та spacing scale | застосовувати послідовно; не створювати другу token database |
| Warm gold / ivory / dark palette | semantic status mapping із текстом/іконкою, не лише кольором |
| Responsive product/editorial images | заміряти hero loading і layout stability перед оптимізаціями |

На мобільному consent banner займає значну частину нижнього viewport і перекриває частину hero content. Це usability observation, не доказ втрати конверсій. Перевірити доступність основної дії та рівнозначність accept/deny, зберігаючи реальний вибір.

## Proposed acceptance areas

Product cards: узгоджені image ratio/name/price/CTA, meaningful alt і чесний availability state. Catalog/Discovery: keyboard filters, clear selection count, empty/error states та збереження вибору. Checkout: labels/autocomplete, inline validation, delivery-lookup failure, price/discount clarity та правдиві pending/unknown/success states.

Admin: читабельні orders/statuses, явний last-sync/stale indicator, consistent loading/empty/error/access-denied, navigation/safe areas, dialog focus і session recovery. Наявність source/CSS не видається за visual pass цих states.

Draft accessibility AC: WCAG AA contrast, visible keyboard focus, announced errors/status, 200% zoom, reduced-motion та 44px product touch-target target. axe та manual keyboard/screen-reader checks ще не виконані. Public product target не є виміряним результатом.

CWV targets: p75 LCP≤2.5s, INP≤200ms, CLS≤0.1. Field baseline відсутній; lab scores не підміняють RUM. Static assets і responsive formats уже є; виміряти network/parse/layout перед module split або новою залежністю. Brand-consistent state screenshots повинні бути reviewed, а не автоматично перезаписані після failure.

Priority/effort/dependencies/outcomes/AC: G07/G08/G10 у [Gap Analysis](GAP-ANALYSIS.md).
