# Independent Review — evidence checklist and private handoff

Це перелік потрібних доказів, не твердження, що вони вже зібрані або незалежно перевірені. Reviewer має бути іншою людиною/стороною, ніж автор implementation/self-review, з відповідною компетенцією. Жодних confidential attachments у public PR, Issues, Actions artifacts або comments. Цей docs correction не виконує сам Independent Review.

## Evidence manifest

Для кожного item: review ID, exact source/PR head, collection UTC time, environment (local/isolated/read-only live), command/method і runtime/tool versions, expected/actual result, owner, redaction status, content digest та independent reviewer verdict. Приватне розташування, identifiers, raw diagnostics і hashes confidential artifacts не переносяться в public manifest. Public response — лише ID/status/summary і accepted residual risk без technical exploitation details.

| ID | Точний required evidence | Для якого рішення / поточний стан |
|---|---|---|
| IR01 | exact heads/base/diff обох PR, shared-path intersection, conflict reconciliation plan, canonical-owner map | завершення docs review; intersection перевірено self-review, independent verdict pending |
| IR02 | повний локальний audit, source-to-finding mapping G01–G11, finding disposition, confidentiality/export/history report | обґрунтованість і повнота audit; local evidence exists, private access та independent verdict pending |
| IR03 | сирий local test output з усіма 19 named cases, команди/runtime/source revision, збережений file-level-only result та warning; mapping п'яти suites до ризиків | достовірність baseline, не live payment proof; local results recorded, independent reproduction pending |
| IR04 | read-only hosting/release/source correspondence, public GET results, actual deployment trigger, current checks/review permissions, release/rollback ownership | safe integration/first PR approval; prior hosting observation є, enforcement/owner decision pending |
| IR05 | secret-free backend source/version inventory, schema/migration drift mapping і ownership boundaries; приватна прив'язка до audited revision | G02 reproducibility review; raw inspection частковий, complete mapping/rebuild pending |
| IR06 | мінімізована private access-control/config review matrix, ефективні permissions та isolation verdict, findings disposition | G04 security review; static inspection не дорівнює isolated role proof, pending |
| IR07 | secret-free server payment source/contract review, integrity/recovery findings і reconciliation responsibilities; bank sandbox availability/limitations | G03 design assurance; source review був self-review, independent provider-contract validation pending |
| IR08 | isolated integration test matrix/results для approved payment, checkout, promotion та access contracts; synthetic test data і expected/actual integrity outcomes | перед relevant functional changes; sandbox/integration execution pending, не замінюється mocks |
| IR09 | anonymous browser method/versions/viewport results і privacy-redacted screenshots; окрема authenticated PWA/session/offline/device matrix з expected/actual states | G07/G08; anonymous observation є, auth/device/accessibility/CWV proof pending |
| IR10 | proposed revenue/receipt/COGS/refund/timezone/customer-identity definitions з owner approval та synthetic reconciliation examples | G06/G10 business review; definitions draft, accounting/stock owner decisions pending |
| IR11 | reviewed minimal CI scope, exact-head baseline/failure-demo results, required-check enforcement evidence, no-production-access/deployment assessment | перший implementation PR; scope draft, CI/enforcement/failure demos не реалізовані |
| IR12 | monitoring coverage/redaction/alert ownership та isolated restore/reconciliation evidence, затверджені RPO/RTO | G09 exit; alert/restore drill pending |
| IR13 | actual tool entitlement/cost/maintenance/privacy assessment і account-level analytics/search/merchant evidence для applicable recommendations | G08/G10/G11 decisions; tooling matrix є, actual accounts/quotes/field measurements incomplete |
| IR14 | signed reviewer disposition per G01–G11 і IR01–IR13: accepted / changes requested / blocked, scope/limitations, owner і next action; окреме business approval плану | завершення independent review/plan approval; pending, цей correction не підпис reviewer |

## Безпечний приватний спосіб передачі — proposed procedure

1. Власник називає reviewer і погоджує приватний канал. Пріоритет — existing private shared workspace або owner-controlled private document/file workspace з доступом лише named reviewer; не public GitHub і не anyone-with-link. У цьому завданні доступи не створюються, запрошення/файли не надсилаються.
2. Evidence owner збирає тільки необхідні IR items у мінімізований пакет. Навіть у private package вилучити credentials, session/return secrets, customer contacts та unnecessary payment data; screenshots/queries перевірити вручну. Для відтворення використовувати synthetic fixtures/read-only reviewer access, не передавати production keys або database dumps.
3. Маніфест і integrity digests залишити в приватному каналі. Передача — encrypted in transit/at rest та named read-only access з expiry/revocation за політикою власника. Якщо використано encrypted archive, ключ передати окремим погодженим приватним каналом. Перевірити recipient, scope і redactions до надання доступу; не публікувати link/key у PR.
4. Reviewer підтверджує отримання, revision і цілісність, відтворює доступні checks в isolated environment, фіксує verdict; unavailable items залишає blocked/not run, не «passed». Після review відкликати непотрібний доступ і погодити retention. Raw material залишається приватним.

## Що означає завершення

Для independent audit/plan sign-off IR01–IR07, наявна частина IR09–IR10 та review scope/feasibility IR11–IR13 мають мати verified evidence або явний reviewer-owned blocker/disposition; IR14 має бути підписаний незалежним reviewer. Owner може погодити план із явно прийнятими residual risks і gates на майбутнє, але це не завершення технічних acceptance criteria.

IR08, невиконані auth/device/a11y/CWV частини IR09, implementation/failure-demo/enforcement IR11 та alert/restore IR12 залишаються незакритими до виконання. Вони обов'язкові перед corresponding behavior change/release згідно з G01–G11; прийняття плану не дозволяє обійти їх. У фінальному verdict слід відокремити «audit conclusions reviewed», «plan approved», «baseline CI implemented» і «production-safe behavior verified».
