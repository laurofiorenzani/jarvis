# JARVIS — Next Session Handoff
**Date:** 2026-11-14  
**Repository:** `laurofiorenzani/jarvis`  
**Canonical branch:** `work/jarvis-canonical-integration`

## A. Current state
- Existing JARVIS project preserved; no duplicate repository, Supabase project, auth system or memory store.
- Supabase project `undmhmdwhxvjgvezvucy` is ACTIVE_HEALTHY in `eu-west-3`; production API v32 and Preview API v23 are active.
- Production migrations remain through `20261113125437`. Family CFO migrations and new feature migrations have NOT been applied to production.
- Canonical continuity ledger: `JARVIS_MASTER_RECORD.md`. This file is the short handoff entry point.
- `PROJECT_STATUS.md`, `TASK_REGISTRY.md`, `TEST_REPORTS.md`, `DEPLOYMENT_STATUS.md`, `DECISIONS_LOG.md` and `CHANGELOG.md` were not found at repository root; do not create duplicate ledgers without first locating an existing canonical equivalent.

## B. Completed this session
- Rechecked open PRs, exact-head CI, canonical ledger, Supabase function versions/migrations/advisors and Vercel deployments.
- PR #37 agent executor: fixed active-handler cancellation semantics and an AbortSignal registration race; added a regression test. Exact-head CI #1175 / run `43596482426` SUCCESS on `f0a4105520f79f1b991f86ae5bd4e9349986455a`.
- PR #39 Family CFO: SQL currency registry validation now requires exactly one effective-dated registry match. Added an overlap regression test; diagnosed first failure as an overlapping synthetic test fixture affecting the positive EUR test, then moved overlap start date to 2026-11-14 while keeping positive EUR test on 2026-11-13.
- Updated `JARVIS_MASTER_RECORD.md` with exact evidence and platform findings.
- Supabase security/health review: no health lints. Rate-limit table RLS-without-policy is intentional (all client privileges revoked). Leaked-password protection is disabled and awaits owner choice; no Auth setting changed.

## C. In progress
- **PR #39 Family CFO:** corrected current head `76267c89fdbfdc380b394033e0ab49b7325fa144`. Exact-head CI #1177 / run `43596794456` was still IN_PROGRESS at last check. Typecheck/build/tests/lint, Deno setup, provider privacy, semantic-memory checks, Edge Function typecheck and speech tests had passed; isolated Supabase DB startup was still running. Must confirm SQL isolation, two-user API and CORS steps before calling it green. The previous head `4f162369d4c9e307857a8b5cff23a9b75895c243` failed SQL test 1/12 because the synthetic EUR overlap fixture also overlapped the positive EUR case; this was fixed only in the newer head.
- **PR #37 agent contracts:** exact-head CI SUCCESS, but remains Draft/open and separate from canonical. It is an injected bounded read-only executor, not a live authenticated agent runtime.
- **PR #38 iOS Keychain adapter:** exact-head CI #43593900571 SUCCESS; no native target/signing/physical device test. PR is Draft and mergeability requires reconciliation.
- **PR #34 BMW CarData:** exact-head CI #43587548093 SUCCESS; read-only adapter only, no BMW owner authorization or vehicle command.
- **PR #31 Observer:** exact-head CI #43587476240 SUCCESS; Observer Validation #43587476231 SUCCESS.
- **PR #23 provider consent/FreeLLMAPI:** exact-head CI #43586430295 SUCCESS, but provider pools remain disabled. Durable cross-instance Cloudflare quota cooldown not implemented.
- PR #35, #36, #33, #22 and #26 have earlier exact-head CI passes recorded in the master ledger; inspect current head before relying on these.
- Canonical CI #43596040162 and #43596040231 SUCCESS on canonical code head `0c1c9f54dddec3125b09acb3d926d1a454ec8f27`.

## D. Test evidence
- PR #37 current head `f0a4105520f79f1b991f86ae5bd4e9349986455a`: CI SUCCESS.
- PR #39 current head `76267c89fdbfdc380b394033e0ab49b7325fa144`: CI pending at last check; do not rely on previous failed run or earlier green head.
- BMW PR #34 `c1024ce253537474989a5dd5024e9ad5f60e7f44`: CI SUCCESS.
- iOS PR #38 `8dbe4f8084c9e306768e330e756fa4be05ce857f`: CI SUCCESS.
- Observer PR #31 `7ba6435a6cf8300a329f47465f36446ad94e739d`: CI and Observer Validation SUCCESS.
- Provider PR #23 `02c4901a9274844e2454899c59dcb7ea5bbd39c6`: CI SUCCESS; not production approved.
- Canonical CI passed on `0c1c9f5`; canonical ledger-only updates after that commit do not need a repeated code build unless source changes.

## E. Decisions and safety gates
- €0 recurring cost remains mandatory. No paid APIs, paid plans, credits, upgrades or overage fallback.
- Cloudflare account audit: zero zones, zero tunnels, zero Worker scripts; entitlements empty; subscriptions/billing endpoint 403 due missing Billing Read. Actual plan/overage settings remain unverified. Do not activate Workers AI.
- Cloudflare Workers AI Free quota is 10,000 Neurons/day; error 3036 / HTTP 429 indicates exhaustion. Diagnostic classification exists; durable cross-instance cooldown does not.
- Provider pools stay disabled until billing/no-overage, EEA processing, retention/training and per-account consent are verified.
- Production API v32 and Preview API v23 differ: Preview has Cloudflare Whisper and EEA checks; production v32 does not. Neither is approved for personal inference pending attestation/parity.
- BMW CarData remains read-only. No climate, lock, door, window, roof or trunk commands.
- Family CFO remains synthetic-only; no real financial data imported, no production schema migration, no money moved.
- iOS secure-storage adapter only; no native Xcode target, signing, TestFlight or physical-device Keychain test.
- No PR merged, no production deployment/migration occurred, no secrets read/changed, no real BMW connection or provider inference.
- Supabase Auth leaked-password protection is currently disabled (WARN). Ask owner before changing account Auth settings.
- Vercel build-rate-limit still blocks new preview builds; existing canonical Preview READY is commit `7098ff4fe340c6392368ebd546e14d4a4deb2956`. No paid upgrade or repeated builds.

## F. Pending by workstream
- **Cloud Brain:** reconcile production v32 vs Preview v23 route drift; validate FreeLLMAPI endpoint/config without exposing keys.
- **Multi-AI:** implement durable cross-instance 3036 cooldown and verify free quota/billing/EEA/privacy before activation.
- **Agents/Self-Evolution:** integrate read-only executor with authenticated owner scope and trusted handler registry; no write tools; executor remains a trusted injected primitive, not a sandbox.
- **BMW:** keep read-only; review/approve migration and official client registration/consent before deployment.
- **Family CFO:** confirm CI #1177 exact head; reconcile schema ancestry; remain synthetic-only.
- **iOS:** continue native SwiftUI shell and Keychain validation without paid Apple developer services.
- **Cloud/infra:** Cloudflare currently has no Worker resources; Oracle Cloud access unavailable through current connected tools.
- **Home, WhatsApp, email, Instagram and Maps:** official integration discovery and implementation remain pending.

## G. Blockers / user action
- No immediate user action required for source-level work.
- Before BMW activation: owner must register/authorize official BMW CarData client and approve controlled migration deployment.
- Before Cloudflare AI activation: owner must verify actual account Free plan and no-overage settings; connected token lacks Billing Read.
- Owner may choose to enable Supabase Auth leaked-password protection; no change made.
- Physical iPhone validation requires access to device/build environment.

## H. Next actions
1. Check exact-head CI #1177 / run `43596794456` on PR #39 head `76267c89fdbfdc380b394033e0ab49b7325fa144`; inspect job logs if any failure.
2. Keep #37/#39 Draft/open. Do not merge self-authored PRs; do a conflict-aware review and explicit integration approval.
3. Continue provider route parity and zero-cost cooldown work without inference, secrets access or billing changes.
4. Continue iOS/BMW/Observer branches, validating exact current heads rather than assuming earlier CI applies.
5. Do not retry Vercel preview builds until rate limit clears; use existing READY preview for read-only inspection.
6. Update this handoff and `JARVIS_MASTER_RECORD.md` at the end of the next session.

## I. GitHub
- Repo: `laurofiorenzani/jarvis`
- Canonical branch: `work/jarvis-canonical-integration`
- Latest canonical ledger commit before this handoff update: `43afd58ab0dae831aab9758cf669dd0f3e6e70ad`
- Current PRs #37 and #39 are Draft/open. #37 exact CI passed; #39 corrected-head CI pending.
- No PR merges or production promotions.

## J. Message to resume
“Continue JARVIS from `NEXT_SESSION.md` and `JARVIS_MASTER_RECORD.md`. First check exact-head CI #1177 on PR #39 and preserve the #37 green result. Continue all independent fronts in parallel, but do not merge self-authored Draft PRs, do not deploy production migrations, do not change Auth/billing settings, and do not activate uncertified providers. Preserve existing code and green tests.”
