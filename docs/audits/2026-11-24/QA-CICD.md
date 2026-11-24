# QA & CI/CD Assessment — public edition

Докази E01–E07 у [Evidence](EVIDENCE.md). Наявні tests запускаються Node без встановлення dependencies. Audit не змінює тести, workflows або deployment configuration.

| Suite | Named scenarios під час первинного аудиту | Межі |
|---|---:|---|
| Admin regression | 4 | mocks/VM, не повний authenticated lifecycle |
| Payment flow | 4 | frontend recovery logic, не bank integration |
| Product revenue | 6 | allocation та exclusions, не повний accounting model |
| Promotion access | 3 | обмежені fixtures, не повна access matrix |
| Server checkout | 2 | targeted regression, не повна integration/concurrency verification |
| **Разом** | **19 passed / 0 failed** | no real payments або production data writes |

Первинний стандартний test command показав 5 file-level results; додатковий прямий запуск дав 19 named scenarios. Мінімальний CI повинен підтверджувати виконання named tests, а не тільки exit code. Тести не послаблювати й first failure зберігати.

## Запропонований pipeline — не реалізований

1. PR checks з мінімальними правами й без production secrets: exact source checkout, approved pinned runtime, timeout та логування результатів.
2. No-install baseline: diff/format sanity, п'ять existing regression files, named-test reporting, syntax/JSON/manifest та documentation-link checks.
3. Release-contract validation: frontend version, release metadata та PWA coherence; docs-only зміни не потребують штучного product version bump.
4. Після approval: isolated backend integration та sandbox payment/recovery verification, включно із цілісністю й відсутністю дублювання. Детальні чутливі сценарії передаються reviewer приватно.
5. Playwright/axe для fixture-based catalog/cart/checkout/admin states; reviewed screenshots, stable animation state, keyboard/accessibility checks. Нові dependencies потребують окремого рішення.
6. Independent review та required checks перед reviewed release. Поточна main publication автоматична; docs merge не виконувати до release approval.
7. Після окремо затвердженого release: read-only smoke, version coherence, operational signals та physical-device verification окремим записом.

Draft AC: baseline checks ≤5 хв після вимірювання в CI; це target, не поточний результат. Не звужувати coverage лише заради швидкості чи зеленого CI.

## Recovery та monitoring

Versioned backend inventory і compatible rollback повинні зберігати нові orders/payments. Потрібен isolated restore drill, reconciliation та призначений recovery owner; RPO/RTO затверджуються після доказів. Ніяких blind production restores.

Технічні журнали та processing mechanisms не замінюють alerts. Запропоновано один error tracker та один availability monitor, з privacy review й budget approval. Acceptance: контрольована тестова помилка доходить до відповідального, sensitive data не потрапляють у telemetry, recovery runbook перевірений. Конкретні production rules/thresholds у публічному пакеті не розкриваються.

Dependencies/effort/risk/owners: G01/G02/G03/G04/G05/G07/G09 у [Gap Analysis](GAP-ANALYSIS.md).
