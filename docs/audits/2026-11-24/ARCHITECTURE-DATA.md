# Architecture & Data Ownership Inventory — public edition

Спостереження станом на 2026-11-24; operational owners ще потрібно призначити. Деталі інфраструктурних ідентифікаторів, security configuration та платіжної реалізації виключено. Джерела — [Evidence](EVIDENCE.md); короткий канонічний опис — [System Spec](../../VAHOME-SYSTEM-SPEC.md).

| Область | Спостережене джерело / відповідальність | Прогалина та рекомендація |
|---|---|---|
| Storefront | Static HTML/CSS/JavaScript і assets у git | зберегти просту архітектуру, додати release-contract checks |
| Catalog / collections / content | Static product definitions, content та SEO pages | display і server checkout definitions мають залишатися узгодженими; контент не є ціною історичного продажу |
| Checkout | Серверна валідація й розрахунок замовлення | authoritative totals належать backend; потрібна ізольована integration verification |
| Orders | Збережений order/item snapshot у backend | це джерело історії замовлень; frontend rollback не повинен втрачати нові замовлення |
| Payments | Серверний стан і технічні події; зовнішній банк | потрібна окрема банківська звірка; browser return або analytics event не доводять надходження грошей |
| Promotions / Discovery | Server eligibility і збережена історія застосування; Discovery product flow | перевірити узгодженість правил та recovery у sandbox; не створювати нові маркетингові правила в аудиті |
| Customer account / CRM | Auth та customer-related data; admin aggregates order history | потрібен узгоджений customer identity contract для retention, без дублювання master data |
| Inventory | Operational source не встановлено аудитом | catalog availability і quantity limit не замінюють фізичний склад; визначити власника й source of truth |
| Finance | Дані отриманих оплат та введених витрат | cash-based management view відрізняється від revenue recognition і matched COGS |
| Logistics / notifications | Backend integrations та processing | operational jobs, reconciliation та delivery evidence потребують перевірки |
| Admin PWA | Authenticated interface та recovery mechanisms | перевірити sessions, device lifecycle, stale-data indication і конфіденційність локального кешу |
| Analytics / SEO | Consent-based web analytics; static metadata/content | web analytics для funnel/acquisition, фінансові метрики — з підтверджених backend/accounting джерел |
| Deployment | GitHub Pages для frontend | main publication автоматична; потрібні reviewed release gates |

## Принципи ownership

Не створювати нові паралельні джерела ціни, замовлення, клієнта або витрат без обґрунтованої потреби. Historical order snapshots повинні залишатися незалежними від поточного catalog display. Відокремлювати fulfillment status, payment status та notification delivery status.

Відомості backend у git не забезпечують повного відтворення системи. Потрібен безпечний versioned inventory та isolated recovery proof; жодних production migrations у цьому PR.

Використання спільної інфраструктури вимагає перевірки product isolation і явного ownership. VAcleaner не змінюється. Матриця доступів та подробиці реалізації збережені лише у повному локальному аудиті; public acceptance criterion — відсутність несанкціонованого міжпродуктового доступу.

Вартість, пріоритети, залежності й AC — G02/G04/G06/G10 у [Gap Analysis](GAP-ANALYSIS.md).
