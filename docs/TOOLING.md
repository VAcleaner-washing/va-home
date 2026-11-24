# Tooling inventory — VA HOME

Observed from main on 2026-11-24; availability and successful execution are separate.
- GitHub, static site, Supabase directory, five root Node test files: present. No package.json or .github/workflows found. Audit runtime, deployment and required gates before introducing CI.
- Supabase: repository directory present; live configuration and permissions not audited.
- Codex: intended execution agent; Claude Code adapter supplied. ChatGPT must explicitly receive/read these files.
- Candidates only: Figma/Storybook (design), axe-core/Lighthouse CI (accessibility/performance), Sentry/Better Stack (monitoring), PostHog/GA4/Clarity (analytics), Metabase (business data), CodeQL/Dependabot/CodeRabbit (security/review), n8n (automation), GitHub Projects (planning).
- For each candidate record existing equivalent, verified access, cost, privacy, benefit, integration effort, owner and acceptance criteria. No installation or paid subscription without applicable approval.
