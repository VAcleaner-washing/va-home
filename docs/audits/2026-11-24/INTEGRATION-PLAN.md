# PR #1 / PR #2 — proposed integration plan

2026-11-24. Documentation-only correction. Обидва PR залишаються Draft; цей план не дозволяє merge, зміну налаштувань або deployment. Main автоматично публікується, тому «docs only» не означає «без publication».

## Перетин, перевірений за поточними PR heads

| Paths | PR #1 | PR #2 | Канонічне рішення після approval |
|---|---|---|---|
| docs/VAHOME-SYSTEM-SPEC.md | provisional inventory, add | sanitized evidence-backed inventory, add | одна canonical path, версія PR #2 з подальшими reviewed corrections |
| docs/TOOLING.md | preliminary list, add | public assessment, add | одна canonical path PR #2, без parallel tooling inventory |
| docs/DEVELOPMENT-ROADMAP.md | preliminary phases, add | proposed dependency-aware plan, add | одна canonical path PR #2; corrections задають порядок baseline → functional work |
| AGENTS.md, CLAUDE.md, docs/ENGINEERING-STANDARD.md, .github/PULL_REQUEST_TEMPLATE.md | policy/adapters/template, add | не змінюються | лишаються scope PR #1; не копіювати policy у audit |
| docs/audits/2026-11-24/*.md | відсутні | audit/review evidence summaries | audit-specific evidence, а не другий System Spec/Roadmap |

На inspected main жодного з трьох shared paths немає; обидва PR додають їх з різним змістом. Після першого merge інший PR потребуватиме reconciliation add/add conflicts. Поточний PR #2 не містить commits PR #1 або локального повного аудиту. Документація не робить provisional assumptions нормативними.

## Безпечна послідовність — лише після окремих approvals

1. Завершити Independent Review exact heads та затвердити план і scope першого implementation PR. До цього обидва Draft, без merge. Evidence/remaining blockers — [review checklist](INDEPENDENT-REVIEW.md).
2. Окремо підготувати [перший implementation PR](FIRST-IMPLEMENTATION-PR.md): minimal no-install regression CI + release-contract checks + release runbook. Він базується на актуальному main і не залежить від попереднього merge PR #1/#2. Поточне завдання його не створює. До bootstrap merge перевірити exact head незалежним review і safe local/manual equivalent checks; не називати неіснуючий CI green.
3. Release owner окремо погоджує будь-який merge bootstrap PR, оскільки main auto-publication залишається чинною. Перед цим потрібні source/artifact compatibility evidence, rollback і post-publication verification plan. Required-check enforcement перевіряє repo admin у межах окремо затвердженої дії. Якщо неможливо забезпечити review/gates або publication не дозволена — інтеграція заблокована. Зміна deployment isolation можлива лише окремою затвердженою задачею, не приховано в bootstrap чи docs PR.
4. Після дієвого baseline CI та release gate оновити PR #2 від нового main без зміни approved audit scope; повторити confidentiality/link/diff/history checks, exact-head CI і Independent Review. Окреме явне release approval дозволяє майбутній merge PR #2. Це все ще publication, не «безпечний автоматичний docs merge».
5. Потім оновити PR #1 від нового main. Для трьох overlapping paths залишити canonical audited content, перенести лише справді нові reviewed facts без повернення provisional тексту. Очікуваний incremental diff PR #1 — policy/adapters/template. Актуалізувати AGENTS runtime/CI observations або замінити їх посиланнями на canonical Spec/QA; не залишати застаріле твердження про відсутність workflows після появи CI. Вилучення дубльованих змін із diff не означає видалення canonical files. Ці дії з PR #1 тут не виконуються.
6. Повторити exact-head checks/review/confidentiality та окремий release approval PR #1; лише після цього розглядати його merge. Статус Draft змінюється тільки у майбутній затвердженій дії, не цим документом.

Ніяких cherry-pick повного локального audit commit, force-push main, automatic conflict acceptance або merge «щоб розблокувати документацію». Після будь-якого rebase review прив'язується до нового head. До завершення інтеграції approved policy PR #1 можна читати як review reference, але не оголошувати його вже інтегрованим у main.

Acceptance: по одному Spec/Tooling/Roadmap, актуальні посилання policy/adapters, жодної втраченої G01–G11/невиконаної перевірки, no runtime/VAcleaner diff у docs PR, private evidence не public, кожна publication має окремий owner approval і verification record.
