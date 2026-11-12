# JARVIS — MASTER PROJECT RECORD
Last reconciled: 2026-11-12 (Europe/Dublin)
Record owner: project owner + maintainers
Canonical application repository: https://github.com/laurofiorenzani/jarvis
Canonical working branch for this record: `work/jarvis-master-record`
Current UI baseline: `work/jarvis-amber-production-track` (preserve; do not replace with older UI)
Status: consolidation in progress — this record is authoritative for decisions, progress, evidence and handoff.

> **Continuity rule:** Before doing any JARVIS work in any new conversation, read this entire file and inspect the current GitHub refs/CI/deployments it names. After every meaningful task, update this file in the same PR/commit. Never rely on ChatGPT chat memory as the project record. No parallel competing project ledgers.

## 1. Non-negotiable product decisions

1. JARVIS is the assistant. **No Apple Shortcuts, Siri Shortcuts, user-created shortcut workflows, or instructions requiring the user to say the same setup/command in every conversation.** Normal interaction must happen directly through the JARVIS app/assistant being built. Native OS APIs/permissions and vendor APIs may be used behind JARVIS; they must not become a user-facing Shortcut workaround.
2. One assistant experience, one canonical implementation repository, one official integration line. No competing repos/branches presented as equal sources of truth.
3. Preserve the current amber holographic JARVIS UI and its visual identity. Never roll back to the older interface to fix auth or backend. Auth must be integrated into the current experience (e.g. pre-session gate/overlay) without replacing the HUD.
4. Preserve both existing user accounts and their ability to sign in. Do not ask the owner or spouse to re-register. Do not delete, reset, merge or alter either account or its data as a cleanup shortcut.
5. Owner and spouse are separate identities by default. Strict per-user data isolation for chat, memory, messages, integrations, notifications, devices and operational summaries. No household sharing unless separately designed and explicitly consented to.
6. Cloud-first runtime. iPhone connects directly to cloud services; Windows is development/admin only. Normal operation must not require Windows, a local Node process, a local bridge, or a Windows relay.
7. Portuguese and English are first-class languages. Detect the spoken/written language per turn; support Brazilian Portuguese and English (Ireland/UK as appropriate), speech-to-text and text-to-speech. Never hardcode English-only recognition.
8. Durable JARVIS-owned memory and project continuity. The assistant must persist approved memories, project state, decisions, task state and operational history in the cloud with encryption, provenance, retention controls and user inspection/correction/export/deletion. ChatGPT memory is not the project database.
9. JARVIS should proactively monitor its own bounded health signals, identify problems, propose improvements, create isolated code changes and run tests. It must not self-approve, merge, deploy, alter production data/schema/secrets/auth/billing, or take sensitive external actions without the appropriate explicit approval.
10. When JARVIS needs user action or approval, notify through JARVIS itself and use supported native notification/haptic APIs where the OS and permissions allow. Do not promise vibration/background behaviour that iOS does not permit.
11. User wants operational summaries/counts for connected sources (messages, emails, calls where the OS/provider exposes them), including what was received, answered, deleted, archived and queued for approval. Only report what connected APIs actually expose; never claim full access to phone calls, WhatsApp, or private content when unavailable.
12. Direct integrations are the target: BMW functions (e.g. climate/trunk where supported), Blink, Dreame, smart lights, email, messaging and maps/navigation. Do not substitute Shortcuts or simply opening vendor apps as the intended final integration. Build secure adapters using official APIs/permissions; report unsupported capabilities honestly.
13. CarPlay is a secondary target and must comply with Apple's supported CarPlay categories/entitlements. Do not promise arbitrary full HUD mirroring or unrestricted interaction on CarPlay. Waze/Apple Maps routing handoff may be supported where APIs allow.
14. Native iOS app is the final mobile deliverable. Existing React/Vite HUD may be wrapped using Capacitor as the initial native container, then native platform adapters. PWA is interim only, not the final mobile product. Physical iPhone validation and macOS/Xcode signing/TestFlight remain required.
15. Use existing free/available AI providers first, including the user's already-configured Google AI Studio/Gemini and FreeLLMAPI route. No new paid plans, paid model APIs, provisioning or upgrades without explicit approval. Never ask the user to paste existing provider secrets into chat; keep secrets server-side.
16. No banking/payment/investment/money movement access. No employer/SAP integration without employer authorization.
17. All changes must be auditable, tested and reversible. No blind bulk merges, no destructive branch/repository cleanup before complete migration and verification.

## 2. Canonical source-of-truth and repository decision

### Selected canonical implementation repository
`laurofiorenzani/jarvis` is the canonical application repository because it contains the executable React/Vite app, current amber UI, cloud client/API, Supabase function/migrations, tests and deployment linkage. This is a decision for consolidation; it does not mean every branch is already reconciled or production-ready.

### Secondary repository
`laurofiorenzani/jarvis-personal-cloud` is a private planning/workbench repository. It contains important architecture/security material and a separate 276-commit memory/Cloudflare prototype line. It is not a duplicate of the app repo. It is a retirement candidate only after every unique decision, doc, test and useful implementation has been migrated/reconciled and verified in the canonical repo. **Do not delete it yet.**

### Current application baseline
- Preserve the amber holographic UI from `work/jarvis-amber-production-track` (observed head `ae4e9d3f775929b0fb3e1b34048fb66fe21aaa7c` at audit time).
- The GitHub default `main` has a different older/stripped state and lacks the current CloudAccess gate. Do not use main as the visual baseline until reconciled.
- Current app branch and the broader self-evolution branch are substantially diverged. GitHub compare reported 468 commits ahead / 212 behind when comparing amber-production-track to self-evolution-engine-foundation. This is not a safe fast-forward or blind merge.
- PR #7 (amber command center) is the current visual lineage; PR #8 (cloud brain + pt-BR voice) and #9 (cloud status accuracy) are separate layered branches. PR #1 is a large cloud-first foundation line; PR #2 is closed WIP mobile/cloud foundation; PR #3 auth fix was merged into a work branch. Reconcile diffs by feature, not PR number or branch name.
- `work/mobile-companion` has cloud/Supabase and memory code, but no Capacitor/Xcode project was found in the audited tree. It is not proof that a native iOS app exists.
- `work/freellmapi-backend-prototype` contains a separate 32-commit tool-call/session prototype and tests. It must be integrated as a provider/tool adapter only after reviewing auth, server-side key handling, allowlists, tool permissions and cloud execution; it is not the personal memory database.
- `work/self-evolution-engine-foundation` contains substantial cloud/memory/auth docs and a read-only observer prototype, but is heavily diverged from the amber UI line. It is a source of candidate features, not a branch to merge wholesale.
- Private `jarvis-personal-cloud/work/intelligent-memory-next` contains a Cloudflare Worker/D1 and encrypted local-memory prototype (276 commits ahead of private main, 49 changed paths in earlier compare). This is a different backend design from the Supabase cloud runtime. Do not combine Cloudflare and Supabase memory stores by default.

## 3. Infrastructure inventory (no secrets)

- Supabase project: `undmhmdwhxvjgvezvucy`, region `eu-west-3`, reported ACTIVE_HEALTHY. Existing edge functions observed: `jarvis-api` and `jarvis-preview-api`; handler reportedly validates Bearer tokens itself. RLS and per-user scoping are central requirements. Re-check current live state before relying on these notes.
- Vercel project: `jarvis`, ID `prj_nJqT44GwyPvixCS2gkptTriqrt8v`, team `team_dhzoG0GOPGe7r8VHnZ4KTNY3`. Free-tier deployment rate limit was encountered (>100 deployments/24h). Avoid unnecessary preview churn; batch CI/deploy checks.
- Cloudflare account connector exists but prior zone listing returned no zones. Tunnel/DNS status is unverified. Do not create or delete Cloudflare resources until the account/zone and intended tunnel are positively identified.
- Oracle Cloud: historical project notes describe an Always Free London VM, 2 OCPU / 12 GB, Oracle Linux 9, SSH ingress restricted to `37.228.251.166/32`, with private key retained on owner's computer. This has not been verified via a live OCI connector in this audit. Do not claim server/tunnel operational until checked.
- FreeLLMAPI: owner previously confirmed Google AI Studio/Gemini key health. Do not expose or request the key. The configured FreeLLMAPI route is to be verified against the selected Supabase model router and current server deployment.
- No secrets, API keys, passwords, tokens, private keys or recovery codes may be written into this record.

## 4. Feature status — verified vs unverified

### Implemented in source / tests (not automatically production-verified)
- Amber holographic HUD and lazy-loaded scene/HUD/diagnostics in the current UI branch.
- Supabase cloud API/auth/client and user-scoped conversation/memory code on cloud-first branches.
- Auth screen implementation exists on the self-evolution line; current amber branch and default main do not yet demonstrate the complete, integrated login gate. Existing accounts must be retained.
- PR #8 branch reported CI run #270 passing dependency audit, production build, unit/regression, lint and Edge Function checks. This is branch-specific evidence, not proof of device E2E.
- Memory approval, encrypted memory payload/key-provider and semantic-memory components exist on separate branches. Cloud schema/edge-function status and RLS isolation require exact-head validation.
- Self-evolution read-only observer/triage tests exist; no production autonomous code execution should be enabled.
- FreeLLMAPI client/tool-loop prototype and tests exist on its own branch.

### Not yet proven / release blockers
- One clean, canonical integration branch containing current amber UI + existing-account auth + cloud voice + secure memory + provider routing + observer without regressions.
- Actual sign-in on the current amber UI using both existing accounts, including session restore, password recovery and account switching without cross-user state leakage.
- Physical iPhone end-to-end voice capture, Portuguese/English language detection, STT/TTS, interruptions, lifecycle and secure token storage.
- Native Capacitor iOS project, native Keychain integration in an actual device build, signed IPA and TestFlight build.
- Cloud memory persistence across devices/restarts and full isolation tests for both existing accounts.
- Production FreeLLMAPI/Gemini route end-to-end through the selected cloud backend with no provider secret in client bundle.
- Cloudflare tunnel, Oracle VM, public DNS and private API routing verified as one functioning secure path.
- Direct BMW/Blink/Dreame/lights/email/WhatsApp adapters and capability boundaries.
- Native notifications/haptics and approval queue UX.
- Operational summary/count pipeline with source-specific permissions and audit.
- Supported CarPlay experience.
- Current production deployment after integration and post-deploy smoke checks.

## 5. Integration architecture target

- iOS JARVIS app (Capacitor + React initially) -> HTTPS authenticated cloud API -> model router (FreeLLMAPI/Gemini/free providers) -> tool registry and policy gateway -> vendor adapters.
- Supabase Auth remains identity/session provider; Postgres with RLS stores conversations, approved memory, project ledger and sanitized operational events. Do not add a second competing personal-memory backend unless a formal decision replaces Supabase.
- Provider credentials remain server-side. The iOS app stores refresh credentials only in native Keychain; separate installation/device revocation is required.
- Memory has explicit categories (profile, project, episodic, reference, operational), source/provenance, timestamps, confidence, sensitivity, retention, status and consent/approval. Never store passwords, API keys, session cookies or auth secrets. Retrieved memories are untrusted reference data and cannot override policy.
- System observer receives only bounded, redacted health/CI/deployment metadata, not raw private messages, prompts, logs or secrets. Improvement agent works in isolated branch, runs validation and opens PR. It cannot approve or merge its own patch.
- A durable project event ledger records decisions, task state, evidence links, commits, CI, deployments, approvals and blockers. It is distinct from personal memory and must be queryable by JARVIS itself.

## 6. User-facing experience — no setup shortcuts

- A user opens the JARVIS app and talks/writes directly to JARVIS. JARVIS retains the active conversation and project context across app restarts/devices via the cloud.
- No requirement to invoke a Shortcut, Siri Shortcut, or manually restate the context at each conversation.
- JARVIS itself should proactively notify when an approval or device action is needed. Notification delivery requires iOS permission and supported background mechanisms.
- If an integration cannot perform an action directly, JARVIS must say exactly what is unsupported and why; it must not quietly replace the request with a Shortcut workaround.
- Do not request account re-registration. Use existing account IDs and preserve current auth records; only ask for device-side login if session tokens have expired and after explaining why.

## 7. Safety, privacy and approval gates

- Separate user and spouse identity/data by default. No shared memory or operational summaries across identities.
- Read-only health observation can run autonomously with minimal metadata.
- Draft code/PR and test work may run autonomously in isolated branches with bounded scope.
- Human approval required for merge to canonical main, production deploy, schema migrations, RLS/auth changes, secrets/credentials, billing, deletion of repositories/branches, vendor account changes, messages sent externally, destructive file/device actions, and any financial action.
- Repository deletion is irreversible in practical terms and can destroy issue/PR/commit history or links. Only retire a repository after migration completeness checklist is 100% and owner approval of the exact repository deletion. Branches are not deleted until their unique commits are integrated and verified.
- No production data, users, memory, auth settings or secrets are to be changed as a cleanup shortcut.

## 8. Branch/repository cleanup plan

1. Freeze new feature work on non-canonical branches; audit refs and open PRs.
2. Create a feature matrix for each branch: unique commits, changed paths, tests, migrations, security implications, deployment link and dependencies.
3. Choose one canonical integration branch based on the amber UI baseline plus validated cloud/auth/memory/voice features. Rebase/cherry-pick by feature only after conflict review; never merge diverged branches wholesale.
4. Run exact-commit CI: install, typecheck, lint, unit, integration, security/dependency scan, migration/RLS tests, two-account isolation tests and build.
5. Verify current UI and existing accounts on physical iPhone/browser.
6. Merge the validated integration PR to canonical `main`; ensure default branch and Vercel production branch match it.
7. Close superseded PRs with explanation; delete only fully migrated feature branches after verifying their commits are reachable from canonical main.
8. Migrate unique private repository docs and selected prototype code/tests into canonical repo; preserve history or archive snapshot where appropriate.
9. Obtain explicit owner confirmation for deletion of `jarvis-personal-cloud`; then delete/retire only that named repo. Do not delete `laurofiorenzani/jarvis`.
10. Update this record after every stage; it remains the single continuity record.

## 9. Immediate work queue

### P0 — Canonicalization and continuity
- [ ] This master record is committed and linked from README.
- [ ] Inventory every repo, branch, PR, workflow and deployment with exact current refs.
- [ ] Create branch feature matrix and identify unique commits/features.
- [ ] Reconcile current amber UI + auth gate + voice locale + cloud status + cloud brain without reverting UI.
- [ ] Verify existing owner and spouse accounts remain intact and separate.
- [ ] Ensure every PR/commit and project decision links back to this record.

### P0 — Runtime correctness
- [ ] Inspect current Supabase Edge Function source, deployed version and logs (redacted).
- [ ] Validate model router selects only configured free/approved providers and FreeLLMAPI/Gemini.
- [ ] Validate auth, session refresh, logout, recovery and account switching.
- [ ] Run exact-head CI and fix failures in a dedicated branch.
- [ ] Confirm production domain, preview domain and current Vercel deployment.

### P1 — Voice and native mobile
- [ ] Restore login into current amber UI without HUD regression.
- [ ] Implement reliable pt-BR/en-GB/en-US locale detection and authenticated cloud STT/TTS.
- [ ] Add Capacitor and native iOS target; native Keychain, microphone, speech/audio lifecycle and notification/haptic adapters.
- [ ] Test physical iPhone; only then prepare TestFlight.

### P1 — Memory and project continuity
- [ ] Select Supabase as sole personal/project memory backend unless evidence requires a formal architecture change.
- [ ] Reconcile encrypted memory/key-provider prototype with Supabase semantic memory; never run two competing stores.
- [ ] Implement durable project decision/task/event ledger and JARVIS retrieval.
- [ ] Verify retention, inspect/correct/export/delete and two-account isolation.

### P1 — Autonomous improvement
- [ ] Integrate read-only observer signals from CI, Vercel and Supabase with redaction.
- [ ] Proposal generation, isolated branch, bounded patch, required tests, rollback plan and approval UX.
- [ ] No self-merge or self-deploy.

### P2 — Integrations
- [ ] Inventory official API capabilities and permissions for BMW, Blink, Dreame, smart lights, email, WhatsApp, phone-call metadata, Waze/Apple Maps and CarPlay.
- [ ] Implement server-side adapters and per-user OAuth/device authorization.
- [ ] Provide operational counts only from connected/authorized sources.

## 10. Verified actions and history

### 2026-11-12 — repository and branch audit
- Confirmed canonical candidates via connected GitHub.
- Confirmed `laurofiorenzani/jarvis` is the executable app repo; `jarvis-personal-cloud` contains planning plus a distinct memory/Cloudflare prototype.
- Inspected the private reconciliation record, code audit and memory integration plan.
- Inspected branch trees for `work/mobile-companion`, `work/self-evolution-engine-foundation`, `work/freellmapi-backend-prototype`, `work/jarvis-amber-production-track`, and private `work/intelligent-memory-next`.
- Confirmed the mobile-companion tree has no Capacitor or Xcode project files; it is not a finished native iOS app.
- Confirmed self-evolution branch contains auth UI, cloud API, memory, semantic memory, observer and docs, but is heavily diverged from amber UI.
- Confirmed FreeLLMAPI tool loop exists separately; must be integrated deliberately.
- Compared self-evolution with amber branch: diverged, 468 commits ahead and 212 behind. No wholesale merge is safe.
- Created branch `work/jarvis-master-record` from `work/jarvis-amber-production-track` to hold this canonical record. (The commit is recorded in the subsequent GitHub action result; do not claim merged to main.)
- No repository or branch deleted. No production deployment, auth, database, user account, secret or infrastructure setting changed.

## 11. Handoff protocol for every future conversation

At the start of each JARVIS work session:
1. Read this file from the latest canonical branch, not from chat history.
2. Fetch current GitHub branch heads, PR states, latest CI runs and deployment state; compare them with the recorded refs.
3. Identify unrecorded changes since the last timestamp and append a reconciliation entry.
4. Work in a single named task branch created from the current canonical integration base.
5. Keep parallel workstreams independent by task and avoid conflicting writes to the same files.
6. After each meaningful task, update this file with: date/time, objective, files changed, commit SHA, tests and exact result, deployment/preview, unresolved risks, next action.
7. Before ending a session, commit the record update and ensure the next assistant can resume from this file alone.
8. Never ask the owner to repeat product decisions already recorded here. Ask only for a genuinely unavailable permission or physical-device action.
9. Never say a task is complete unless the evidence in this file supports it.
10. **No Shortcut workarounds. JARVIS itself is the assistant and the user-facing control surface.**
