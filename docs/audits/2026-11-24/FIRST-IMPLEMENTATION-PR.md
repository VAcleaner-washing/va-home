# First implementation PR — proposed scope, not started

Після затвердження плану й окремої authorization. Тема: **minimal regression CI and release gates** (G01 + baseline частина G05). Мета — зробити наявні перевірки відтворюваними та блокувати неперевірені функціональні зміни. Це не backend/payment modernization. [Integration order](INTEGRATION-PLAN.md) визначає bootstrap approval за чинного main auto-publication.

## Точний proposed file scope

| Файл майбутнього PR | Дозволена поведінка |
|---|---|
| .github/workflows/regression.yml | PR та main verification-only jobs; read-only permissions, reviewed pinned Actions/runtime, no production secrets, no deployment, обмежені timeout/CI concurrency |
| .github/scripts/run-regressions.cjs | Node built-ins: виконати всі п'ять existing suites, показати named scenarios/result summary, fail при test failure або missing/zero discovery; не змінювати assertions/tests |
| .github/scripts/check-release-contract.cjs | read-only syntax/JSON/manifests, documentation relative-link sanity і release/PWA consistency checks для наявного формату; docs-only зміна не вимагає version bump |
| docs/RELEASE-CHECKLIST.md | єдиний operational runbook: exact head/checks/reviewer, approval, known publication behavior, compatible rollback і post-release evidence; посилання на вже canonical audit/QA |

Existing suites: admin-regressions.test.cjs, payment-flow.test.cjs, product-revenue.test.cjs, promo-access.test.cjs, server-checkout.test.cjs. Existing tests та runtime залишаються без змін. Named baseline на reviewed source — 19; якщо source зміниться, count та mapping переглядаються явно, а не тихо зменшуються. No package.json, npm install, new dependency, backend export, migrations, provider call, payment/logistics behavior або deployment configuration change. No pull_request_target execution of untrusted code. Workflow перевіряє repository revision, а не пише в production. Artifact/log export лише secret-free; no raw private evidence.

Repo admin окремо підтверджує stable required check names, що відповідають усім baseline jobs, review enforcement та release approval owner. Це repo-settings action, не прихована автоматизація у workflow і не частина поточного docs PR. Якщо permission/plan не дозволяє effective enforcement — blocker до functional modernization, а не успішний implementation acceptance.

## Acceptance та validation

- П'ять suites, 19 named cases на approved baseline; exit code, discovery/count і результати видимі. Наявний file-level-only output не приймати за повний proof.
- Disposable checkout з контрольованим failing assertion і окремо missing-suite/discovery case робить gate red; робочі tests не послаблюються й fixtures змін не потрапляють у PR.
- Release-contract check приймає поточний verified baseline і docs-only diff; навмисна розсинхронізація у disposable fixture робить його red. Якщо baseline вже не проходить, зафіксувати first failure та окремо узгодити виправлення, не підганяти правила або runtime під green.
- No runtime/database/workflow-deploy/VAcleaner delta поза наведеним scope; required checks/review enforcement підтверджено до будь-якої functional modernization.
- CI/runtime supply chain reviewed; no production credentials; rerun не приховує first failure. Метрики з [QA assessment](QA-CICD.md#engineering-process-effectiveness) збираються з першого run, невідомі baseline values не вигадуються.
- Separate statuses: self-review, Independent Review, local QA, CI, publication та post-release/device checks. Цей CI PR не закриває payment/access/PWA integration gaps.

Rollback scope — compatibility-preserving revert CI/scripts/runbook з окремим release review; не обходити gate для functional release. Bootstrap merge потребує exact-head manual/local proof і owner-approved publication plan до появи required CI на main. Після його інтеграції зміни checkout/backend/payments дозволені лише зі своїми relevant expanded integration gates. Точні gates і dependencies — G05 clarification у [Gap Analysis](GAP-ANALYSIS.md).
