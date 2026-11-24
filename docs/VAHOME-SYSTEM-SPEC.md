# VA HOME — System Spec (public inventory)

Оновлено 2026-11-24. Опис verified observations та gaps, не нові бізнес-правила. [Audit index](audits/2026-11-24/README.md), [Evidence](audits/2026-11-24/EVIDENCE.md), [ownership inventory](audits/2026-11-24/ARCHITECTURE-DATA.md). Security-sensitive implementation details збережено лише локально.

## Product та technology

VA HOME — static HTML/CSS/vanilla JavaScript e-commerce із Supabase backend і окремою admin PWA. Публічна production версія під час аудиту — 16.4.18. Frontend публікується GitHub Pages із main автоматично; merge потребує окремого release approval. Product catalog, editorial/SEO pages, collections, Discovery, cart/checkout, customer account та order status існують.

Checkout totals та authoritative order creation належать backend. Історичні order/item snapshots відокремлюються від поточної catalog presentation. Є server-side payment confirmation та захисні механізми, але повна integration/recovery assurance ще не доведена. Browser analytics не є джерелом підтверджених оплат. Logistics і notification integrations присутні, operational verification неповна.

Admin містить orders, customer aggregation, catalog view, finance/expenses, marketing та settings. Product editing/stock ledger не підтверджені. Finance view базується на оплатах і витратах; revenue recognition, historical COGS та refund accounting contract потребують затвердження.

## Reliability та ownership

Існують access controls, session recovery, PWA caching/recovery та consent-based web analytics. Подробиці production configuration не публікуються. Повна role/device/lifecycle verification pending. Спільна infrastructure responsibility потребує доведеної product isolation; VAcleaner не змінюється.

Backend inventory у git неповний для clean rebuild. Необхідні versioned secret-free inventory, isolated restore proof та recovery ownership. Передбачувані релізи мають окремо перевіряти frontend/backend compatibility і PWA version coherence без втрати нових orders/payments.

## Verification та unresolved questions

19 named local mock regressions pass; обмежений anonymous visual smoke виконаний. Independent Review, authenticated E2E, bank sandbox, physical devices та restore drill не виконані. Unknown: stock/COGS operational source, refund accounting completeness, field CWV, actual campaign economics та повний monitoring coverage. Детальні recommendations/AC — [Gap Analysis](audits/2026-11-24/GAP-ANALYSIS.md).

Стандарт із [PR #1](https://github.com/VAcleaner-washing/va-home/pull/1) залишається окремим незлитим PR. Поточний public audit не переносить його коміти й не оголошує план затвердженим.
