# VA HOME — proposed modernization roadmap

2026-11-24. **Draft: Independent Review та approval pending.** Professional Audit & Gap Analysis виконано; recommendations не реалізовані. [Audit](audits/2026-11-24/README.md), [G01–G11 contracts](audits/2026-11-24/GAP-ANALYSIS.md).

| Phase | Стан / наступна робота | Exit criteria |
|---|---|---|
| A — Baseline | public release/hosting/source перевірені; PR #1 лишається окремим | G01 safe release policy, independent review, no unapproved deployment |
| B — Inventory & safety | ownership/gaps зафіксовані; confidential evidence лишається локально | approved audit; G02 reproducibility, G03 payment assurance, G04 isolation, G06/G10 business definitions |
| C — Engineering process | minimal pipeline/recovery/monitoring запропоновані | G05 named regression gates + integration, G07 lifecycle/device evidence, G09 recovery/alerts, G11 dependency governance |
| D — Product & growth | існуючий premium brand збережено, measurement contract draft | G06 reconciled metrics, G08 a11y/performance baseline, G10 SEO/Discovery/stock ownership та approved experiment |

Після approval: release control → backend/payment/access proof → CI/recovery → reliable analytics → targeted UX/performance/growth. Priority/impact не підміняють phase. Часові estimates, costs, owners, dependencies та AC канонічно ведуться у Gap Analysis.

До затвердження плану немає runtime, database, deployment configuration або dependency changes. Для майбутньої behavior change — один PR із відповідними tests/docs та release/recovery plan. Не змінювати VAcleaner; не вводити платні сервіси без погодження. Наступний етап саме Independent Review, не implementation.
