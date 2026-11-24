# Gap Analysis — proposed decisions

Усе нижче — пропозиції для Independent Review, не реалізовані зміни. Evidence IDs — [Evidence](EVIDENCE.md). Priority відокремлено від impact; підтверджений production incident не встановлено. Чутливі technical findings виключені, проблеми узагальнено.

Effort: S≈0.5–2 дні, M≈3–5 днів, L≈1–2 тижні за наявності доступів; це preliminary engineering estimate, не quote або commitment. Recurring costs unknown до account/budget review. Owner — роль до призначення.

| ID / phase / priority | Evidence / проблема | Рішення / очікуваний результат | Ризик зміни / effort / complexity | Dependencies / owner | Acceptance Criteria |
|---|---|---|---|---|---|
| G01 A/C high | E01–02: main automatic publication, release gates incomplete | погодити docs/release policy, передбачуваний merge | medium / S / low; existing platform | repo/release owner, review access | exact head reviewed, required checks відомі, publication окремо approved; цей PR не merge/deploy |
| G02 B/C high | E05: backend не повністю відтворюється з git | reviewed secret-free version inventory та isolated rebuild | high при неправильно scoped backend work / M–L / high | backend owner, approved isolated environment | reproducible compatible backend, VAcleaner unchanged, no production apply; raw confidential export не public |
| G03 B high | E04–05: payment recovery assurance incomplete | independent technical review і sandbox/fault verification | high financial / M / high | payment owner, private evidence, bank sandbox | payment/order integrity збережена при recovery; no duplicate charges/orders; bank reconciliation documented; real payments excluded |
| G04 B/C high | E05: access/isolation proof incomplete | least-privilege review й isolated role tests | high privacy/shared infrastructure / M / high | security/backend owner, G02 | unauthorized cross-customer/product access denied; audit evidence privately reviewed; no weakened controls |
| G05 C high | E01/E03–04: targeted mocks, regression CI gap | no-install baseline checks, потім isolated integration/E2E | low для baseline, medium integration / M / medium; CI quota TBD | QA/release owner, G01/G02 | 19 named scenarios visible, synthetic test failure blocks release, first failure retained; baseline feedback target ≤5m after measurement |
| G06 B/D high | E06: cash/revenue/profit та analytics definitions різні | approve metric/timezone/identity/refund contract й reconcile | medium business/privacy / M–L / medium | accounting/business/backend, G02/G04 | fixtures покривають approved statuses/refunds/timezones; unknown≠zero; events deduplicated; cash≠revenue≠profit |
| G07 C/D normal | E06–07: PWA/device/recovery/completeness verification incomplete | session/offline/update matrix, stale-data clarity та privacy review | medium / M / medium; existing devices | QA/admin owner, G05 | isolated lifecycle tests preserve integrity/confidentiality; cached data не authorization authority; device results окремо documented |
| G08 D normal | E07–08: design foundation є, a11y/CWV baseline absent | document existing tokens та targeted UX/performance baseline | low docs, medium UI / M / medium | design/frontend owner, G05 | key states reviewed at mobile/desktop, keyboard/contrast/zoom evidence, measured performance; premium identity збережена |
| G09 C high | E05–06: alerting/restore proof не встановлено | minimal monitoring та recovery ownership/drill | medium privacy/operations / M / medium; service quote TBD | SRE/release owner, G02/G04 | test alert reaches owner, telemetry excludes sensitive data, isolated restore preserves order/payment continuity, RPO/RTO approved |
| G10 D normal | E06: stock/COGS ownership та growth data incomplete | discover operational source, validate SEO/feed/cohorts | medium data/marketing / M discovery, L ledger if needed / medium | product/business/growth, G06 | sources named/reconciled, no invented scarcity, actual search/merchant evidence, one approved measured experiment |
| G11 C normal | E01: dependency/reproducibility governance needs review | evaluate pinning/security maintenance strategy | medium compatibility / S–M / medium | frontend/backend owner, G05 | reproducible artifacts, auth/offline regressions pass, dependency checks cover actual delivery method |

Tool decisions map to these contracts: G05 QA/CI, G08 design, G09 monitoring, G06/G10 analytics/growth, G11 supply chain. Не встановлювати інструмент без конкретної потреби, owner, privacy review та cost approval. Повний список — [Tooling](../../TOOLING.md).

## Review clarification: baseline та expanded G05 dependencies

Таблиця G01–G11 вище збережена без вилучення ризиків, dependencies або Acceptance Criteria. Це additive уточнення порядку, не waiver і не закриття finding.

- G05 baseline (existing Node regression + minimal release-contract gate) залежить від G01 scope/release decision та approved runtime, **не від завершення G02**. G01/G05 bootstrap передує functional backend/payment modernization. Це усуває початкову неоднозначність спільної Dependencies cell.
- G05 expanded backend integration залежить від G02 reproducible source/isolated fixtures та G04 access-contract readiness; payment integration також від G03 private contract review і bank sandbox. Read-only G02/G03/G04 review не заблокований CI; відповідні functional changes — заблоковані до baseline та risk-specific gates.
- G03/G04/G06–G11 зберігають свої AC/ризики/owners та додають baseline G01/G05 як prerequisite **для functional implementation**. Готовність relevant expanded gates потрібна перед corresponding behavior change, а не довільне виконання лише наприкінці roadmap.
- G05 operational AC доповнено [метриками процесу](QA-CICD.md#engineering-process-effectiveness) та [точним bootstrap scope](FIRST-IMPLEMENTATION-PR.md). Ні 19 mocks, ні швидкий CI не закривають sandbox/device/isolation/restore перевірок.

Порядок review/merge без duplication — [Integration Plan](INTEGRATION-PLAN.md). Приватні докази та незалежний verdict — [Independent Review checklist](INDEPENDENT-REVIEW.md). Невиконані перевірки залишаються pending/blocked; plan approval не перетворює їх на passed.
