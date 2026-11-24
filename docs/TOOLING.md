# Professional Tooling Assessment — public edition

2026-11-24. Present/configured/verified/proposed — різні статуси. [Evidence](audits/2026-11-24/EVIDENCE.md). Нічого не встановлено й не придбано в аудиті.

## Verified baseline

GitHub repository/PR та frontend hosting доступні; Codex/MCP використовувалися для audit. Existing Node tests виконані. Система залишається static HTML/CSS/JavaScript + Supabase. Environment Playwright/Chromium використано для обмеженого smoke; це не означає repo E2E suite. Exact account plans, quotas, paid entitlements та API permissions тут не публікуються.

Cost categories не є quote: OSS/free tier можуть потребувати hosting/CI/maintenance і мати limits. Actual plan/usage/tax/currency перевіряються перед procurement. Наявність нового vendor не повинна дублювати canonical data або порушувати consent/privacy.

| Tool | Наявність / аналог / користь | Cost / privacy / compatibility | Рішення / AC dependency |
|---|---|---|---|
| GitHub / Projects | repository verified; board unverified; Markdown roadmap already exists | existing plan/quota unknown; no customer PII in issues | retain GitHub; Projects optional; G01/G05, owner/status backlog |
| Codex / MCP / ADR | execution/connectors used; ADR adoption proposed | existing account costs unknown; least privilege, sanitized outputs | concise ADR for material decisions only; G02/G04 |
| ESLint / Prettier | no repo config found; Node baseline exists | OSS dev tools; legacy browser globals require review | normal/M after approval; G05/G11, no bulk reformat |
| Figma | access unverified; existing CSS tokens | free/paid seats; no private customer screens | optional low/S; G08 brand-derived reviewed reference |
| Storybook | absent; static HTML has no framework component suite | OSS plus maintenance/optional hosting | defer low/L until reuse need proven; G08 |
| Design Tokens | shared CSS present | no new service needed | retain/document normal/S; G08, one canonical source |
| axe-core | suite not established | OSS, browser integration; manual audit still required | normal/S after approval; G05/G08 key-flow accessibility |
| Playwright | environment smoke used, repo suite absent | OSS + CI/browser compute; fixtures only | high/M; G05 deterministic isolated tests, no live payments |
| Vitest | absent; Node runner adequate now | OSS, extra config/dependency | defer low/M unless concrete need; G05 |
| Node regression | 19 named tests executed | bundled runtime, no install baseline | retain high/S; G05 named reports/gates |
| Visual regression | audit observations, no reviewed suite baseline | local tooling possible; hosted cost unnecessary now | normal/M; G08 reviewed stable-state screenshots |
| Lighthouse CI | absent; responsive assets already exist | OSS + CI cost; lab≠field CWV | normal/S; G08 measured baseline before budgets |
| GitHub Actions | hosting publication observed; regression pipeline gap | quota unknown, no production secrets in PR checks | high/M; G01/G05 minimal pipeline |
| CodeQL | configuration/status unverified | terms/availability and actual source coverage verify | normal/M; G04/G05 triaged actionable findings |
| Dependabot | config not found; delivery methods need coverage review | platform availability unknown; not universal dependency coverage | normal/S; G11 actual dependencies covered |
| CodeRabbit | integration unverified; review process exists | free/paid terms unknown, source shared with vendor | defer low/S; does not replace independent reviewer; G01 |
| Supabase CLI | not used/installed in audit; read-only connector sufficient | OSS CLI; cloud resources may cost; shared-scope care | high/M for approved isolated workflow only; G02/G04 |
| Sentry | no SDK evidence found; technical logs partial analogue | free/usage tiers; scrub sensitive data, retention/region review | proposed high/M; G09 test alert + privacy proof |
| Better Stack | account unverified; hosting status not uptime SLA | free/paid quotas unverified; public URL checks only | proposed high/S; G09 one availability service/owner |
| GA4 | configured consent-based integration, dashboard access unverified | standard offering; exact plan unknown; consent/data minimization | retain high/M; G06 paid-event reconciliation/dedup |
| Google Tag Manager | gtag presence does not prove GTM container | platform tiers; governance/CSP/privacy review | defer normal/S unless tag ownership need; G06 no duplicate events |
| PostHog | integration not found; overlaps GA4 | allowance/usage tiers; replay privacy/retention | defer low/M; G06 one concrete unanswered product question |
| Microsoft Clarity | integration not found | official free positioning; consent/masking review | defer low/S; G08 at most one replay tool after approval |
| Metabase | absent; admin management views already exist | OSS self-host operations or paid cloud; least-privilege reporting | defer normal/L; G06 reconciled metric model first |
| Google Search Console | property access unverified; metadata/sitemaps present | standard no-fee tool; property access needed | normal/S; G10 actual indexing/schema evidence |
| Google Merchant Center | account/feed unverified | listing tooling vs paid ads separate | normal/M; G10 approved price/availability parity |
| Meta Pixel / Conversions API | no integration evidence in inspected files | marketing spend separate; consent, minimization, dedup | defer normal/M; G06/G10 approved event definition/privacy |
| n8n | absent; backend processing already provides automation | self-host license/ops or paid cloud; credentials/workflow privacy | defer low/L; G09/G10 concrete gap + idempotency/monitoring |

S/M/L effort та повні priority/risk/dependencies/outcome/AC у [Gap Analysis](audits/2026-11-24/GAP-ANALYSIS.md). Deferred означає відсутність доведеної потреби, а не заборону інструмента назавжди.

## Cost evidence limits

Під час первинного audit офіційні GA4, Sentry, PostHog та Clarity pages були доступні; Better Stack pricing lookup blocked. Точні тарифи/entitlements не підтверджені. Official references для procurement review: [GitHub](https://github.com/pricing), [Figma](https://www.figma.com/pricing/), [Sentry](https://sentry.io/pricing/), [Better Stack](https://betterstack.com/pricing), [PostHog](https://posthog.com/pricing), [Clarity](https://clarity.microsoft.com/), [Metabase](https://www.metabase.com/pricing/), [n8n](https://n8n.io/pricing/). Відсутність SDK не доводить відсутність зовнішнього account.

Мінімальна пропозиція: existing GitHub/Node suite + release/provenance checks, reviewed backend inventory; далі isolated integration/Playwright, один error tracker та один availability monitor після approval. Не розгортати кілька analytics/replay/pixel систем одночасно без measurement/privacy plan.
