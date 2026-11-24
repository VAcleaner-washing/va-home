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
4. Лише після baseline CI/release gates та відповідних G02/G04 prerequisites: isolated backend integration та sandbox payment/recovery verification, включно із цілісністю й відсутністю дублювання. Детальні чутливі сценарії передаються reviewer приватно.
5. Playwright/axe для fixture-based catalog/cart/checkout/admin states; reviewed screenshots, stable animation state, keyboard/accessibility checks. Нові dependencies потребують окремого рішення.
6. Independent review та required checks перед reviewed release. Поточна main publication автоматична; docs merge не виконувати до release approval.
7. Після окремо затвердженого release: read-only smoke, version coherence, operational signals та physical-device verification окремим записом.

Draft AC: baseline checks ≤5 хв після вимірювання в CI; це target, не поточний результат. Не звужувати coverage лише заради швидкості чи зеленого CI.

## Recovery та monitoring

Versioned backend inventory і compatible rollback повинні зберігати нові orders/payments. Потрібен isolated restore drill, reconciliation та призначений recovery owner; RPO/RTO затверджуються після доказів. Ніяких blind production restores.

Технічні журнали та processing mechanisms не замінюють alerts. Запропоновано один error tracker та один availability monitor, з privacy review й budget approval. Acceptance: контрольована тестова помилка доходить до відповідального, sensitive data не потрапляють у telemetry, recovery runbook перевірений. Конкретні production rules/thresholds у публічному пакеті не розкриваються.

Dependencies/effort/risk/owners: G01/G02/G03/G04/G05/G07/G09 у [Gap Analysis](GAP-ANALYSIS.md).

## Engineering Process Effectiveness

Це proposed measurement contract; фактичних CI/lead-time baseline values ще немає. Source — GitHub run/check/PR metadata і approved release-verification record; без customer data, private logs або security evidence. Збирати з першого baseline run. QA/release owner відповідає за щотижневий review; кожні 30 днів — trend report з p50/p95 та sample size. До ≥20 completed eligible PR-head attempts у вікні 30 днів — лише descriptive results з позначкою low sample, без висновку «target achieved».

Одиниця baseline — перша повна required-check перевірка exact PR head; new source head = нова одиниця, rerun того самого head не замінює перший результат. Baseline/expanded jobs вимірювати окремо; docs/runtime PRs і queue time показувати окремо. UTC timestamps, calendar elapsed time. Canceled/superseded/skipped/missing jobs не вважати success, показувати окремими counts; incomplete required checks блокують release.

| Metric | Формула / період / source | Proposed effectiveness criterion / дія |
|---|---|---|
| CI duration | required-check attempt finish − start; parallel jobs = elapsed span, не сума; p50/p95 за 30 днів, queue time окремо; feedback time від enqueue до завершення | baseline p95 execution ≤5 хв — draft target із початкового G05, не виміряний факт; якщо перевищено — profile runner/setup/tests, не скорочувати coverage |
| First-pass success rate | eligible PR heads з усіма required jobs successful на першій спробі / eligible terminal non-canceled перші спроби ×100; terminal partial/skipped/missing-required result = non-success, ongoing/canceled окремо | baseline і trend до numeric target approval; погіршення на двох consecutive weekly reviews → owner investigation; не підвищувати rate skip/weak assertions |
| Rerun rate / attempts | PR heads із ≥1 repeat attempt / eligible observed heads ×100; додатково Σrepeat attempts та attempts/head; native run_attempt і повторний workflow run того самого head зв'язувати | 100% повторів мають reason, owner та посилання на збережений first failure; blind rerun не accepted evidence; target rerun rate погодити після baseline |
| Failure causes | counts і частка невдалих attempts за code/regression, test nondeterminism, runner/network, toolchain/config, policy/check enforcement, unknown; rerun failure рахується окремо | 100% failures мають disposition; initial unknown допустимий, triage ≤2 робочих днів як draft target; flake лише після доказу, не після випадкового green |
| Change → verified release lead time | approved revision first observed у PR (provider UTC event) → successful exact-revision/artifact post-release verification record; p50/p95 по released changes за 30 днів | не зупиняти таймер на merge/CI green; не released → pending age, не 0; окремо review/queue/approval/publication/verification delays. Numeric target після baseline, без обходу release approval |

Для cancellations denominator і count фіксувати явно: first-pass denominator — terminal non-canceled initial required-check sets (включно з failure/terminal partial/skipped/missing-required); незавершені sets — pending count/age; rerun denominator — усі eligible observed PR heads, canceled-only показувати окремо. Partial/skipped checks не дозволяють sign-off. New-head failure та rerun same-head розрізняти, не приховувати невдалий revision заміною на новий.

Operational acceptance G05: traceability head→checks→first failure/rerun reason→review→release artifact/verification; 100% release records мають actual proof або статус pending/blocked; weekly owner report містить знаменники, sample size, causes і next action. Improvement означає швидший достовірний feedback і менше повторних дефектів, не просто green percentage. Rate targets/2-day triage/5-minute budget тут запропоновані, не затверджені production SLA.

Minimal CI спочатку, expanded gates за залежностями — [Roadmap](../../DEVELOPMENT-ROADMAP.md) і [G05 clarification](GAP-ANALYSIS.md). Scope першого implementation PR — [окремий contract](FIRST-IMPLEMENTATION-PR.md). Наявні sandbox/authenticated/device/restore gaps не видалено й ці метрики їх не закривають.
