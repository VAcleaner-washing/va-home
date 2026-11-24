# VA HOME — baseline release and recovery checklist

G01/G05 bootstrap only. No storefront, backend, database, payment or deployment behavior changed. This workflow verifies PRs (including Draft) and main; it does not deploy. Main's existing automatic publication remains unchanged. A merge still needs separate owner release approval.

## Before review / release

- Record exact base/head and tested merge revision, diff scope, author/self-review, named independent reviewer and release owner. New pushes invalidate prior exact-head evidence. Keep PR #1/#2 separate; their canonical integration remains planned, not executed by this bootstrap.
- Local no-install checks: `node .github/scripts/run-regressions.cjs` and `node .github/scripts/check-release-contract.cjs` using Node 24.22.3. Five unchanged suites must report 19 passing named scenarios, no skips/todos/cancellations. Counts are a reviewed baseline, not permission to suppress new tests. Review changes to the manifest explicitly.
- Confirm both CI checks: **node-regressions** and **release-contract**, on the expected revision. A failed, skipped, canceled, missing or stale check is not a pass. No blind rerun: retain first failure, classify cause and record reason/owner for each additional attempt.
- Review controlled failures in disposable copies: failing assertion, missing suite/zero discovery and release-version mismatch must return nonzero. Never commit modified test assertions or production fixtures. HTML asset cache revisions may append a descriptive suffix to the current release; worker/PWA VERSION remains exact. The check rejects a stale release prefix, not an intentional cache suffix. Baseline coherence failure is a blocker to diagnose, not a reason to weaken assertions or silently change runtime.
- After CI checks exist, the owner/admin must separately authorize and configure required checks for main using their actual check names/source. This workflow does not configure repository settings. Active PR-only rules with zero approvals do **not** enforce independent technical review; record that review separately. Do not claim merge blocking by status checks until effective enforcement is verified. No bypass or rule relaxation to release.
- Check no runtime/database/VAcleaner or deployment configuration delta, no production credentials/network writes, reviewed Action SHAs and runtime version. No dependency install or product version bump for docs/CI-only work.
- Owner explicitly approves publication; release owner records compatible known-good source/artifact, recovery plan and expected post-publication evidence. CI green alone is not approval or production proof. Never merge automatically from this workflow.

## Measurement and evidence

Scripts emit named results and verification duration in milliseconds; each job records elapsed time from its first step through verification, excluding queue time and runner allocation. GitHub job/run start/completion timestamps give total hosted duration and queue/feedback analysis. Matrix jobs are parallel: use elapsed span, not summed durations. The final timing step runs after failure too; cancellation may prevent it, so retain provider metadata. No wall-clock duration is fabricated for unfinished CI.

Record run ID/attempt, head/tested revision, outcome, first failure and rerun cause. Preserve counts for success/failure/cancellation/unknown; do not replace the first attempt with a green rerun. Track first-pass success, reruns, failure taxonomy and change-to-verified-release lead time against the audit measurement contract. The proposed baseline p95 execution target is ≤5 minutes, subject to sufficient sample size; this first run cannot establish p95 or a reliable success rate.

Canonical proposed roadmap / process contracts remain in [audit PR #2](https://github.com/VAcleaner-washing/va-home/pull/2), and engineering policy in [PR #1](https://github.com/VAcleaner-washing/va-home/pull/1) until their separately approved integration. This runbook does not duplicate or approve those documents. Private review material never goes in public logs/artifacts/PR comments; publish sanitized summaries only.

## After an independently approved publication

Release owner checks deployed version and compatible source/artifact correspondence with read-only smoke, relevant PWA version coherence and operational signals. Record production and device verification separately from CI/local QA. Authenticated E2E, sandbox payments, isolation, restore drills and physical devices remain open risk-specific gates; the 19 mocks do not close them. No real payment/order is used to test this baseline.

## Recovery procedure

1. Freeze further releases; identify last compatible source/artifact and what actually failed. Retain failing revision, checks and notification history without exposing customer/payment secrets.
2. For this CI-only change, propose a reviewed revert/fix of workflow/scripts/runbook; rerun required checks and obtain owner release approval before any main update. Do not turn off mandatory gates simply to deliver a functional release. Repository settings recovery is a separate owner-admin action.
3. If storefront publication is affected by a future release, restore only a known compatible frontend artifact with a reviewed plan; recheck backend contract compatibility and PWA update behavior. This workflow performs no rollback/deployment automatically.
4. Never restore an old production database snapshot as a frontend rollback. Preserve and reconcile new orders/payments. Database/backend repair requires its own approved recovery plan and qualified owner.
5. Verify the recovered release with read-only smoke, version/artifact correspondence and relevant monitoring. Record residual issues and follow-up. Missing evidence remains blocked, not passed.

Self-review, independent review, local QA, hosted CI, production and physical-device checks must each state passed/failed/not run/blocked. Implementation of CI does not itself authorize merge, publication or a new paid service.
