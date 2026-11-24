# VA HOME — proposed modernization roadmap

2026-11-24. **Draft: Independent Review та approval pending.** Professional Audit & Gap Analysis виконано; recommendations не реалізовані. [Audit](audits/2026-11-24/README.md), [G01–G11 contracts](audits/2026-11-24/GAP-ANALYSIS.md). Корекція review: minimal regression CI і release gates передують будь-якій функціональній модернізації backend/payments. Read-only inventory/review можна продовжувати до implementation approval.

## Execution order та exit gates

| Stage | Робота після відповідного approval | Exit / що блокується |
|---|---|---|
| 0 — Independent Review та рішення | [private evidence checklist](audits/2026-11-24/INDEPENDENT-REVIEW.md), canonical overlap/release ownership | reviewer disposition і owner approval scope/плану; без implementation/merge |
| 1 — Baseline engineering gates | G01 + baseline G05: [перший implementation PR](audits/2026-11-24/FIRST-IMPLEMENTATION-PR.md), no-install Node CI, release-contract checks, review/enforcement та runbook | visible 19 named cases на approved baseline, negative gate proof, effective required checks, explicit publication approval. До цього functional modernization заблокована |
| 2 — Reproducibility та access assurance | G02 inventory/isolated rebuild, G04 review/role proof; expanded G05 backend gates після ready fixtures/source | related integration gates і compatibility/isolation evidence готові до relevant backend behavior changes; no production apply в audit/CI bootstrap |
| 3 — Payment assurance перед payment behavior | G03 independent review та sandbox proof; relevant expanded G05 на reproducible isolated backend | integrity/recovery/reconciliation AC виконані; no real payments, no duplicate orders/charges; payment changes тільки окремим approved PR |
| 4 — Reliability, measurement та продукт | G07 lifecycle/devices, G09 alerts/recovery, G11 dependency governance; G06 metrics, G08 UX/CWV, G10 growth/stock | свої risk-specific gates/owner decisions перед відповідною зміною; unresolved checks не стираються загальним green CI |

Stages — execution sequence; початкові A/B/C/D phase labels у G01–G11 лишаються audit classification, не дозволом почати backend work раніше CI. Functional backend/payment changes після Stage 1 та relevant integration gates Stages 2/3. Expanded tests додаються за dependencies, а не всі одразу як блокер no-install baseline. Read-only design/metrics planning може йти незалежно; implementation gates залишаються.

## Інтеграція документації

[Canonical integration plan](audits/2026-11-24/INTEGRATION-PLAN.md): після approved CI bootstrap і safe-release gate — reviewed PR #2, потім reconciled PR #1 без повторного введення трьох shared provisional documents. Кожен майбутній main merge — окрема approved publication, не автоматичне docs-only виключення. Зараз обидва PR Draft, без merge.

[Process effectiveness](audits/2026-11-24/QA-CICD.md#engineering-process-effectiveness) визначає CI duration, first-pass success, reruns, failure causes і verified-release lead time; фактичні baseline values не вигадуються. Estimates, risks, dependencies та Acceptance Criteria канонічно лишаються у Gap Analysis.

До затвердження плану немає runtime, workflows, database, deployment configuration чи dependency changes. Для майбутньої behavior change — один PR із відповідними tests/docs та release/recovery plan. Не змінювати VAcleaner, не вводити платні сервіси без погодження. Next step — Independent Review та approval, не implementation.
