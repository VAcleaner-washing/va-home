# E-commerce & Business Analytics Assessment — public edition

Це draft measurement contract, не затверджені бухгалтерські чи бізнес-правила. Значення метрик не обчислювалися, customer/order rows не публікуються. Докази E05–E06 у [Evidence](EVIDENCE.md).

## Фактичний стан продукту

Існують catalog, collections, product pages, Discovery selection, cart/checkout, account і order-status flows. Admin містить orders, customer aggregation, catalog view, payments, expenses, marketing і settings. Server-side checkout controls є; повний stock management та product editing не підтверджені. Promotions і logistics integration присутні, але їх повна операційна перевірка не завершена.

Payment status, fulfillment і notification delivery — різні стани. Наявні захисні механізми потребують sandbox/integration proof перед змінами. Повний refund/partial-return workflow та settlement reconciliation не встановлені аудитом. Це прогалини перевірки, не твердження про доведений фінансовий інцидент.

## Спільні запропоновані правила

UAH; reporting Europe/Kyiv, UTC storage, період [start,end) і DST fixtures. Поточна timezone consistency потребує перевірки. Виключати явно марковані test records. Рішення про recognition, tax/shipping, refunds і customer identity затвердити з business/accounting owner. Unknown не замінювати нулем; не віднімати знижку двічі від уже discounted total.

Для операційного report пропонується дата refund event; для cohort report — restatement початкового cohort. Full/partial refunds вимагають actual amount та linkage. Ці пропозиції не є існуючим затвердженим contract.

| Метрика | Джерело / формула | Період, статуси й повернення | Готовність / gap |
|---|---|---|---|
| Revenue | historical lines: Σ unit price × qty до знижок | recognition day/month; draft: fulfilled eligible orders; test/cancel excluded, returns окремо | recognition/tax/shipping policy pending |
| Net Revenue | Revenue − discounts − recognized returns | те саме recognition window; actual refunds за approved event/cohort rule | return ledger/policy неповні |
| Cash receipts | reconciled bank/transfer/COD receipts | дата фактичного отримання; reversal окремим outflow | admin paid view — proxy; не bank statement і не Revenue |
| COGS | recognized units × historical unit cost + approved attributable costs | matched до recognition; returned stock за approved valuation | SKU history/valuation не підтверджені; period expenses не заміна |
| Gross Profit | Net Revenue − matched COGS | same recognition/status/refund contract | blocked by COGS/recognition |
| Gross Margin | Gross Profit / Net Revenue ×100 | same window; denominator=0 → unknown | управлінська cash margin не тотожна gross margin |
| AOV | Net Revenue / distinct eligible orders | recognition cohort, canceled/test excluded; refund/count rule approved separately | paid-order AOV можливий як явно названий proxy |
| CAC | attributable acquisition spend / first-time paying customers | acquisition month/cohort; non-test valid paid; refund policy explicitly applied | spend attribution/customer identity incomplete |
| ROAS | attributed net revenue / ad spend | campaign + approved attribution window; refund reconciliation | ad account/window data не перевірені |
| CLV | cumulative net contribution / cohort customers | draft matured 90/180/365-day cohorts; valid orders, refunds and matched costs | lifetime spend не CLV; cost/identity gaps |
| Repeat Purchase Rate | customers with ≥2 eligible orders / customers with ≥1 | draft matured 180-day acquisition cohort; fully refunded excluded; partial net rule | current all-time proxy не cohort proof |
| Checkout Conversion | distinct valid submitted orders / checkout sessions; paid conversion окремо | draft 7-day completion window; submitted і paid явно розділити; refunds не стирають funnel event | reliable session/order linkage pending |
| Cart Abandonment | 1 − carts reaching valid order / eligible active carts | draft 7-day cart cohort; submissions, test exclusion; refunds не abandonment | cross-session identity/consent bias unresolved |
| Product Performance | qty, allocated net amount, distinct orders by SKU | явно named paid або recognized window; refunds allocated per SKU | exact allocation regression є; return completeness pending |
| Inventory Turnover | matched COGS / average inventory at cost | month/quarter; opening/closing або weighted stock; returns restock with cost | stock ledger/valuation source unknown |

## Analytics, SEO та growth

GA4 consent-based code та ecommerce events присутні. Browser purchase формується у frontend й не є authoritative paid/revenue record. Потрібні узгоджені event definitions, deduplication і звірка з backend; не публікувати контактні дані, платіжні атрибути або raw payload у analytics.

Canonical metadata, structured content, sitemaps, category/product/editorial pages — наявна SEO основа. GSC coverage, Merchant Center approval, campaign attribution/ROI не перевірені через account-access limitations. Пріоритет — надійний Discovery→full-size cohort та repeat purchase measurement перед новими pixels/replay tools. Рекомендації G06/G10, privacy/cost — [Tooling](../../TOOLING.md).
