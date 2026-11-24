# Risk Register — public edition

Якісні оцінки не є статистикою чи твердженням про підтверджену експлуатацію. Security/payment подробиці залишені приватними. Evidence — [ledger](EVIDENCE.md); costs/dependencies/AC — [Gap Analysis](GAP-ANALYSIS.md).

| Risk | Evidence / узагальнення | Likelihood / impact / urgency | Наявна основа | Action / owner |
|---|---|---|---|---|
| R01 | E02: automatic production publication | confirmed behavior / medium-high release / high | known frontend hosting | G01 release owner; Draft без merge |
| R02 | E04–05: payment recovery не повністю доведена | occurrence unknown / high financial / high | server-side controls present | G03 payment owner; independent sandbox verification |
| R03 | E05: incomplete backend reproducibility | high / high recovery / high | live backend + partial versioned source | G02/G09 backend/recovery owner |
| R04 | E05: access/product isolation assurance incomplete | unverified / high privacy / high | existing access controls | G04 security owner; private review та isolated proof |
| R05 | E03–04: mocks сприймаються як full release proof | medium / high regression / high | 19 named cases | G05/G07 QA; separate CI/live/device statuses |
| R06 | E06: web events/cash proxy трактуються як revenue/ROAS | high semantic risk / medium business / high | analytics/expense views exist | G06 accounting/product owner |
| R07 | E06–07: PWA stale-data/privacy та lifecycle uncertainty | medium / medium-high operational/privacy / normal | recovery mechanisms present | G07 admin/QA owner |
| R08 | E06: stock/COGS authority не встановлено | unknown / medium oversell/margin / normal | catalog/checkout validation | G10 product/operations owner |
| R09 | E06: reporting completeness при масштабуванні | volume-dependent / medium / normal | existing aggregation/loading | G07/G06 QA/data owner |
| R10 | E07–08: accessibility/performance baseline incomplete | unknown / medium UX / normal | tokens/responsive assets | G08 design/frontend owner |
| R11 | E01: dependency maintenance/reproducibility governance | unverified / medium-high / normal | existing simple stack | G11 engineering owner |
| R12 | E05–06: monitoring та restore/reconciliation proof incomplete | unknown / high recovery / high | technical event processing | G09 SRE owner |

Next step — independent findings review та plan approval. Цей PR не виправляє й не змінює production controls. Public summaries не слід використовувати як operational incident runbook.
