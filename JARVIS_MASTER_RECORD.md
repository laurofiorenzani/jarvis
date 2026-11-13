# JARVIS — MASTER PROJECT RECORD
Last reconciled: 2026-11-13 (Europe/Dublin)
Record owner: project owner + maintainers
Canonical application repository: https://github.com/laurofiorenzani/jarvis
Canonical working branch for this record: `work/jarvis-canonical-integration`
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


## 12. Live infrastructure and PR refresh — 2026-11-12 22:01 UTC

- Current open PR inventory in canonical repo: #1 cloud-first foundation (open, non-draft, base main, head work/memory-integration-ready); #4 semantic memory (draft); #5 self-evolution foundation (draft); #6 older amber command-center branch (draft); #7 amber production UI (draft, base main); #8 cloud brain/pt-BR voice (draft, base amber production); #9 cloud connectivity accuracy (draft, base voice locale); #10 this master record (draft, base amber production). Do not treat PRs as one linear stack; several bases diverge.
- Current branch inventory includes the above and additional feature/fix branches. No branch has been deleted.
- PR #10 opened at https://github.com/laurofiorenzani/jarvis/pull/10, head `af95a1ad81ae0f3aebdf2522f409d3fc19fc732f`, 2 files changed (master record and README link). It is documentation-only and is not merged. Vercel generated preview deployment; one deployment for this branch was READY and the newest one was still BUILDING at the time checked.
- Supabase live project still reports ACTIVE_HEALTHY. `jarvis-api` v32 and `jarvis-preview-api` v10 are ACTIVE. Their deployed source includes free-provider router and semantic-memory code. `verify_jwt=false` is configured at the gateway, so the handler's own bearer-token validation must be maintained and re-tested; this is not evidence of anonymous access being safe by itself.
- Vercel recent deployments show READY previews for the amber production UI commit `ae4e9d3...` and voice-locale commit `0fd9f36...`; the latest cloud-status commit preview is READY. The master-record documentation branch has a READY deployment for its first commit and a newer deployment still BUILDING. One earlier amber deployment is ERROR. These are previews, not proof of production release.
- Cloudflare account has no active Cloudflare Tunnel returned by the read-only account query. Therefore a Cloudflare Tunnel is **not configured/verified in the connected account** at this time. No tunnel or DNS was created.
- Oracle Cloud remains unverified because no OCI connector is available in this session.
- No resources were deleted, no PR was merged, and no production settings were modified.


## 13. Critical correction — no-Shortcuts requirement enforced — 2026-11-12 22:09 UTC

A deeper review of the older `docs/integrations/UNIFIED_ASSISTANT_INTEGRATIONS.md` exposed contradictory legacy text: it described Apple Shortcuts as the first BMW integration route and contained a mistaken Blink heading/paragraph that referred to the BMW Shortcut flow. This directly contradicted the owner's explicit product requirement. The integration document has now been rewritten on branch `work/remove-shortcut-architecture` to remove every Shortcut-based implementation path and require direct JARVIS adapters only. It also makes clear that vendor apps may be used only for initial linking/consent/recovery, never as the ordinary assistant workflow.

- New corrected document commit: `7cdd4868e16ab17a040f348fba02204a5c6acc78`.
- This change is in an isolated branch and is not merged or deployed.
- The previous integration plan must be treated as superseded once the corrective PR is reviewed.
- This finding demonstrates why repository-wide doc/code search is required before declaring the project reconciled.
- No repositories/branches/accounts/data were deleted or changed.


## 14. Current amber UI + cloud auth integration candidate — 2026-11-12 22:16 UTC

- Created `work/jarvis-canonical-integration` from the semantic-memory/auth foundation branch, then ported the current amber UI layer from `work/jarvis-amber-production-track`: current CSS, Scene/Core/MemoryWeb/Particles, store, HUD, CommandCenter, CloudMemoryPanel source, and AppErrorBoundary.
- Updated `src/App.tsx` to lazy-load the current Scene/HUD/Diagnostics and use AppErrorBoundary while retaining the CloudAccess runtime and memory approval UI. This is intended to retain the amber interface and cloud account capability together; physical visual validation remains pending.
- Removed the duplicate CloudMemoryPanel account/login/token path from CommandCenter because it used a separate global localStorage auth implementation. The single CloudAccess runtime remains the account/memory control surface. The old CloudMemoryPanel source file is currently orphaned and must be reviewed/removed in a follow-up cleanup after dependency checks.
- Added `SPEECH_LOCALE` config (pt-BR default, en-GB/en-US selectable) and changed browser SpeechRecognition to use it. This is configurable locale support, not yet automatic per-utterance language detection.
- Opened draft PR #12: https://github.com/laurofiorenzani/jarvis/pull/12. Base `work/intelligent-memory-foundation`, head `f295bcfa9112a37e91f149cd3c26e349ae0151cf` at opening. CI run #717 (GitHub Actions ID `43318376095`) was queued at 22:16 UTC; no pass/fail result available yet.
- This candidate has not been merged, deployed to production, or physically tested on iPhone. The current amber UI files were copied from the exact amber branch head `ae4e9d3...`; app auth/memory code remains from the semantic-memory foundation line.
- Known unresolved integration risks: CloudMemoryPanel source still contains the older localStorage singleton implementation but is no longer imported by CommandCenter; CloudAccess uses an ephemeral in-memory token store by default and optional tab sessionStorage, not native Keychain; native Capacitor app is still absent; browser language is selected by config, not auto-detected.
- No user accounts, passwords, auth sessions, production data, secrets, Supabase settings, deployments or repositories were modified/deleted.


## 15. Repository consolidation and continuity audit — 2026-11-12 22:40 UTC

### Canonical integration branch
- Current integration candidate: `work/jarvis-canonical-integration`, based on `work/intelligent-memory-foundation`. Current code head at this record update: `257cce934ae6e2c2059e30e22dba4087dca156fe`.
- Relative to default `main`, this branch has 487 commits ahead / 3 behind and a 124-file tree diff. This is a substantial consolidation, not a safe blind merge. Do not retarget to main or merge until each unique subsystem and production dependency is reviewed.
- Current amber HUD files, cloud auth/memory foundation, account-switch clearing, guarded STT/TTS, read-only observer and no-Shortcuts integration spec are now present in this candidate.
- The older `CloudMemoryPanel` source is a null-returning deprecated stub; CommandCenter no longer uses its duplicate localStorage auth path.
- CloudAccess no longer exposes account creation in its UI. Existing-account sign-in, password recovery and resend-confirmation paths remain. The two existing accounts are not re-created or modified.
- CloudAccess now uses a runtime generation guard. Sign-out invalidates in-flight memory/conversation operations, clears account-scoped component state immediately, and the App clears HUD turns/panels/blades, memory confirmation queue, STT and TTS provider state. Late STT/TTS results are discarded if the account changes.
- Voice locale is configurable (pt-BR default, en-GB/en-US selectable); automatic per-utterance language detection is still not proven.
- Current product experience target includes core presence, memory constellation with provenance, connected sources, explicit camera vision, device controls, mission/task center, diagnostics and guarded self-improvement. The current visual HUD exists; the full connected-source/device/vision/task experience is not yet implemented. The camera/live-vision architecture document is target-only; no multimodal camera endpoint or live video capture has been shipped.

### Branch inventory snapshot (compare against the integration branch)
| Branch | Unique commits/files vs candidate | Decision |
|---|---:|---|
| `work/jarvis-amber-production-track` | 212 / 49 | Keep until every unique cloud/action-approval/voice/UI feature is reviewed and migrated; only selected current UI files have been ported so far |
| `work/jarvis-voice-locale` | 233 / 52 | Keep; review cloud STT/TTS, language, cancellation and connectivity changes feature-by-feature |
| `work/jarvis-cloud-status-accuracy` | 225 / 51 | Keep until status and health semantics are reconciled |
| `work/freellmapi-backend-prototype` | 32 / 21 | Keep; review provider/tool-loop code; local Node/MCP bridge is not the final mobile/cloud runtime |
| `work/mobile-companion` | 114 / 18 | Keep until useful cloud contracts/docs are reconciled; audit found no Capacitor/Xcode project |
| `work/memory-integration` | 148 / 42 | Keep for review; encrypted local/bridge memory is not to be merged wholesale into cloud-first runtime |
| `feature/intelligent-memory` | 17 / 7 | Review local memory implementation; retire only after confirming no unique security tests are needed |
| `feature/live-vision` | 2 / 2 | Migrate camera/live-vision design as a target-only spec, then retire |
| `fix/auth-invite-password-recovery` | 5 / 3 | Auth recovery/resend behaviour and tests are represented in the integration candidate; verify exact test coverage before retiring |
| `work/jarvis-amber-command-center` | 19 / 11 | Older UI line; observer/experience design work is being migrated; retire only after unique docs reviewed |
| `work/self-evolution-engine-foundation` | 14 / 7 | Read-only observer, test and design doc have been ported; `README.md` and product vision are the remaining unique files to reconcile |
| `work/intelligent-memory-foundation` | 0 / 0 | Base of current candidate; can be retired after PR #12 is integrated |
| `work/memory-integration-ready` | 0 / 0 | Ancestor only; can be retired after dependent PRs/branches are reconciled |
| `feature/gemini-live-voice` | 0 / 0 (behind) | No unique files vs candidate; retire after checking open references |
| `fix/restore-main-preview-build` | 3 / 0 | No unique file diff; retain until mainline/preview history is reconciled |
| `main` | 3 / 0 | Must remain until the canonical integration is approved and promoted |

All branch counts are a snapshot from GitHub compare, not a deletion authorization. Do not delete any branch with unique commits or open PR references until the migration checklist is complete.

### Private secondary repository
- `laurofiorenzani/jarvis-personal-cloud` remains a private planning/research repository, not the canonical app.
- Its `work/intelligent-memory-next` branch has 276 unique commits and 49 changed paths versus private main. It contains a separate Cloudflare Worker/D1 + local encrypted-memory prototype and memory-key lifecycle/approval research.
- The selected production data architecture is Supabase Auth + Postgres/RLS + Edge Functions. Do not run Cloudflare D1 and Supabase as competing personal-memory stores.
- Preserve key lifecycle findings: encryption needs versioned keys, rotation/recovery, backup and fail-closed behaviour; the old local Windows vault/bridge is not the mobile/cloud key store.
- The Supabase semantic-memory schema currently stores content in the database under RLS and managed at-rest encryption; it does not yet provide the application-level envelope encryption described in the private prototype. **Do not store highly sensitive secrets or high-risk personal content in JARVIS memory until application-level encryption, key versioning/rotation, recovery and deletion are implemented and tested.** Approved low-sensitivity memory remains opt-in and user-scoped.
- The private repo is a retirement candidate after its useful research is captured here. No repository deletion has been performed.

### Self-evolution observer
- Ported `src/lib/system-observer.ts`, its privacy/triage tests, the self-evolution design doc and two workflows into the canonical integration candidate.
- Observer accepts only allowlisted metadata (API/PWA/CI/deployment status, timestamps, bounded status/duration codes); it drops prompts, request bodies, tokens and arbitrary fields. Proposals always require human approval.
- `JARVIS Observer Validation` run #23 succeeded. `JARVIS Read-only System Observer` run #17 succeeded. These workflows are read-only and do not yet persist incidents into JARVIS memory or autonomously write code.
- The scheduled observer only becomes active on the default branch after a later approved merge. The current branch's push workflow validates the observer tests/build.

### Preview infrastructure and blockers
- Vercel branch-scoped Preview environment variables were created for `work/jarvis-canonical-integration`: `VITE_BACKEND=cloud`, public Supabase URL/anon key, and `VITE_SUPABASE_FUNCTION_NAME=jarvis-preview-api`. No service-role or provider secret was added to the client.
- Supabase `jarvis-preview-api` was deployed as version 11 (ACTIVE, `verify_jwt=false`, handler-level bearer validation retained) with the canonical integration preview origin allowlisted. Production `jarvis-api` was not modified.
- Vercel has a free-tier API deployment cap of more than 100 deployments per 24 hours. The requested redeploy of the latest candidate was rejected with HTTP 402 and `retryAfter=86400`. No billing/plan change was made. The existing READY preview is for older commit `b96dd59...`; it predates the latest account-switch/observer/CORS changes and must not be represented as the latest build.
- The new CI workflow now includes a preflight check against the canonical preview origin and `jarvis-preview-api`; current CI run #757 is executing against the latest pre-CORS-workflow code, and a newer run is queued for head `257cce...`.
- Cloudflare account still reports no active tunnel and no zones. Oracle Cloud cannot be inspected via the currently connected tools. FreeLLMAPI can be added to the server-side provider router only when a stable HTTPS endpoint is reachable; no Windows/local relay is permitted.

### Repository cleanup capability
- The connected GitHub actions available in this session do not expose repository deletion, branch deletion or PR-close operations. No destructive GitHub cleanup has been attempted. The exact retirement candidates are listed above; perform deletion only after migration and with a GitHub operation that supports the requested action.
- Open PR inventory remains #1, #4, #5, #6, #7, #8, #9, #10, #11 and #12. PR #12 is the active integration candidate; #10/#11 are documentation branches whose content is also included in #12. Do not merge multiple overlapping PRs independently.

### Validation evidence
- Full CI run #730 succeeded on commit `987509759f40a3619d53c1cd7b22b60f075a497c`: TypeScript/build, unit tests, lint, provider privacy routing, Edge Function typecheck, isolated Supabase migrations, SQL account-isolation tests, two-user semantic-memory API tests and production cloud API/CORS smoke test all passed.
- Later commits added account-switch race guards, observer workflows and preview CORS validation. They are being revalidated in CI; do not treat run #730 as validation of commits after `987509...`.
- No existing account was deleted, recreated or modified. No production database schema, production Edge Function, production domain, billing plan or main branch was changed.


## 16. Automatic memory, direct-integration and cleanup progress — 2026-11-12 22:52 UTC

### Automatic memory consent and isolation (live read-only verification)
- Supabase Auth currently contains exactly 2 accounts (aggregate count only; no user IDs or email addresses retrieved).
- `jarvis_memory_preferences` currently contains 1 row: retrieval enabled for 1 account and auto-capture enabled for 1 account. The other account has no preference row and therefore remains at the default-off setting. No spouse preference was changed.
- `jarvis_memory_facts` currently contains 0 rows (0 pending, 0 approved). No personal memory content has been saved yet.
- These were read-only aggregate queries. No account, preference or memory row was modified.
- The integration candidate now includes the `auto_capture_enabled` migration and the foreign-key index migration from the current amber line; it includes the latest Edge Function semantic-memory/auto-capture implementation and Deno tests.
- CloudAccess now exposes two independent controls: include approved memories in replies, and automatically suggest memories from conversations. Auto-capture is disabled unless explicitly enabled for that account and only creates filtered pending suggestions; it never approves or saves facts automatically. Turning retrieval off also disables auto-capture. Re-enabling retrieval does not silently re-enable auto-capture.
- API types/client, UI, unit test and two-user integration test were updated for the separate auto-capture preference. The two-user integration test now verifies default-off for both fixture accounts, explicit opt-in for user A, user B remains off, and disabling retrieval disables auto-capture.
- Highly sensitive content remains disallowed until application-level envelope encryption and key rotation/recovery are implemented.

### Direct integration and approval architecture
- Added/replaced `docs/architecture/hybrid-brain.md` with the cloud-first brain/action architecture. It explicitly removes the local Windows bridge from the production mobile path.
- Added `docs/architecture/action-approval-lifecycle.md` defining cloud-side, one-shot, digest-bound approvals, fail-closed behaviour, account/session binding and native JARVIS notifications. It clearly states that the cloud action loop is not yet shipped.
- Added `docs/product/JARVIS_EXPERIENCE_VISION.md` and `docs/architecture/CAMERA_LIVE_VISION.md` as target-only specs. They are not claims that camera vision or connected devices are implemented.
- The FreeLLMAPI prototype still depends on a separate Node/MCP runtime and has not been integrated into the cloud provider router. The router supports server-configured OpenAI-compatible free-tier endpoints, but a stable HTTPS FreeLLMAPI endpoint is unavailable until Oracle/secure tunnel connectivity is verified.

### CI and preview
- Latest integration head after the current CI/workflow updates: `4362b135bc769c3923d80e89cb55182c1399cbe6`.
- Added Deno tests for semantic-memory validation and auto-capture policy to the main CI workflow.
- Updated the two-user semantic-memory integration script to verify per-account auto-capture consent.
- Reduced duplicate CI runs: main CI and observer-validation now run on PRs and main pushes; the read-only production observer runs on main pushes and schedule.
- The canonical preview origin is allowlisted in the `jarvis-preview-api` code and the Vercel branch-scoped public client variables are present. The preview function is currently v11, deployed before the latest auto-capture code was ported; deploy v12 after the new CI run passes.
- Current CI run #791 is queued for the Deno semantic-memory tests and the updated two-account auto-capture integration tests. Do not mark the latest head validated until that run finishes.
- Vercel cannot redeploy the latest branch while the free-tier 24-hour deployment cap is active. No paid upgrade was made.

### PR and cleanup progress
- Closed PR #10 (master record), #11 (no-Shortcuts integration spec), #5 (self-evolution prototype) and #6 (older amber command center) as superseded by PR #12; their relevant work is included or superseded in the integration candidate.
- Closed private repo PR #3 (repository reconciliation) after moving its findings into this master record.
- Remaining open canonical repo PRs: #1 cloud foundation, #4 semantic memory foundation, #7 amber production UI, #8 cloud brain/voice locale, #9 cloud status accuracy, #12 canonical integration candidate.
- No repository or branch was deleted. The connected GitHub actions do not expose repository-delete or branch-delete operations. The private `jarvis-personal-cloud` repo and remaining feature branches remain retirement candidates only after final feature reconciliation.


## 16. Continuation audit — 2026-11-13 06:20 Europe/Dublin

### Live GitHub state rechecked
- Canonical application repository `laurofiorenzani/jarvis` exists, is writable by the connected account, and its default branch is still `main`.
- Private `laurofiorenzani/jarvis-personal-cloud` still exists and is not empty. Its `main` contains architecture, integration, memory, roadmap and security documents. Its branch inventory includes `main`, `work/intelligent-memory`, `work/intelligent-memory-next` and `work/repository-reconciliation`. The README describes it as a planning workspace, but the private memory branch is a materially distinct Cloudflare Worker/D1 prototype. Do not delete before a path-by-path migration/reconciliation.
- Canonical repo branch search returned the following visible branches: `feature/gemini-live-voice`, `feature/intelligent-memory`, `feature/live-vision`, `fix/auth-invite-password-recovery`, `fix/restore-main-preview-build`, `main`, `work/freellmapi-backend-prototype`, `work/intelligent-memory-foundation`, `work/intelligent-memory-next`, `work/jarvis-amber-command-center`, `work/jarvis-amber-production-track`, `work/jarvis-canonical-integration`, `work/jarvis-cloud-status-accuracy`, `work/jarvis-master-record`, `work/jarvis-voice-locale`, `work/memory-integration`, `work/memory-integration-ready`, `work/mobile-companion`, `work/remove-shortcut-architecture`, `work/self-evolution-engine-foundation`. This is a live inventory snapshot, not a deletion approval.
- PR #12 remains OPEN and DRAFT, head `e5d34dfea3baf59cb86b647ad0348be282667666`, base `work/intelligent-memory-foundation` (not `main`). It is mergeable according to GitHub metadata, but this does not make it a safe mainline release. Its current diff includes the current amber UI/auth/memory/voice integration, observer workflows and this master record.
- The latest observed successful check on that head is Observer Validation run #48 (`43323568754`). It is not the complete CI suite. The Vercel status on the same commit is FAILURE solely because the account hit the deployment rate limit (retry after 24 hours); do not upgrade billing or retry repeatedly.
- The candidate CI workflow now triggers push only on `main` (and pull_request/workflow_dispatch). This means ordinary pushes to working branches do not get the full CI run; PR validation is still configured. Review this trigger change before promoting the integration.
- PR #12 is still a candidate, not a production release. Do not merge, retarget, delete branches/repos, or promote deployments until full CI on the exact head, mainline reconciliation, and device validation gates are satisfied.

### Immediate work queue (resume here)
1. Inspect the full PR #12 changed-file list and exact-head checks, distinguish full CI from observer-only validation, and repair any CI trigger regression.
2. Compare `work/jarvis-canonical-integration` against `main` and each feature branch; create a per-feature migration matrix with file-level provenance before changing main.
3. Review all unique files and commits in `jarvis-personal-cloud` including `work/intelligent-memory-next`; migrate design/security findings into this single record and only the chosen Supabase architecture. Do not run Cloudflare D1 as a competing memory store.
4. Verify the existing two Supabase accounts, current amber UI sign-in/recovery, PT/EN speech, memory consent/isolation and iPhone browser behaviour. No re-registration.
5. Verify Vercel quota reset before one batched preview deployment; do not alter billing.
6. Keep Oracle/Cloudflare resources untouched until their live ownership, current state and role are confirmed. No credentials or private SSH keys in chat or Git.
7. Close/delete secondary branches and retire the private planning repository only after every unique useful item is migrated, tests pass and no open PR/deployment depends on them.

### Explicit status correction
The current work has not yet produced one official `main`, and it has not completed repository/branch cleanup. The canonical repository and candidate integration line are identified, but the consolidation is still in progress. This record is the single project ledger; do not create competing continuity files.


## 17. Deep audit results — 2026-11-13 06:25 Europe/Dublin

### Exact candidate validation
- Candidate head before this ledger update: `457324f6c26ef498abbcfd29fb8b114455b93888`.
- Full CI run #800 passed on that exact head: typecheck, production build, tests, lint, provider-privacy tests, semantic-memory/auto-capture policy tests, Supabase Edge Function typecheck, local Supabase startup, all migrations applied to an isolated database, SQL account-isolation regression tests, authenticated two-user semantic-memory API test, production API/CORS smoke test and candidate-preview CORS smoke test.
- Observer Validation run #49 also passed on the same head, including observer privacy/triage tests, build and lint.
- Vercel deployment for the exact head is **READY**: `https://jarvis-git-work-jarvis-canonical-integration-lauro-fiorenzani.vercel.app`. This supersedes the earlier Vercel rate-limit failure seen on an older attempt. Do not claim the iPhone E2E has passed; it has not been run by the user.
- PR #12 remains OPEN and DRAFT. Its base is `work/intelligent-memory-foundation`, not `main`. Do not retarget or merge until the stack and mainline divergence are reconciled.

### Regression and PR-stack provenance
- `main` is 3 commits ahead and 513 commits behind the candidate integration branch (132 changed files in the main-to-candidate comparison). The three unique main commits include the removal of the CloudAccess UI from main's preview and a revert that kept cloud speech off main. This is the concrete source of the login/voice regression seen on the older preview.
- Open PR dependency stack:
  - PR #1: `work/memory-integration-ready` -> `main` (cloud-first foundation and guarded memory).
  - PR #4: `work/intelligent-memory-foundation` -> `work/memory-integration-ready` (semantic memory).
  - PR #12: `work/jarvis-canonical-integration` -> `work/intelligent-memory-foundation` (current amber HUD/auth/voice integration).
  - Separate UI/voice stack: PR #7 `work/jarvis-amber-production-track` -> `main`; PR #8 `work/jarvis-voice-locale` -> #7 branch; PR #9 `work/jarvis-cloud-status-accuracy` -> #8 branch.
- PR #12 currently contains the amber interface, CloudAccess sign-in/recovery, cloud STT/TTS integration, account-switch clearing/guards, semantic-memory UI/API, observer, migrations and central ledger. Existing accounts are used; signup entry is intentionally hidden to avoid duplicate accounts.
- PR #7 contains separate local-bridge approval primitives (`bridge/action-approval.mjs`, `bridge/action-risk.mjs`, `bridge/pending-approvals.mjs`) and tests that are **not present** in the current PR #12 candidate. The cloud approval lifecycle document is present, but actual cloud-side per-action approval execution/UI is not complete. Do not mark external actions as implemented.
- The PR #8 cloud voice changes are represented by a different implementation in the candidate; compare behavior and tests before closing PR #8. Do not delete the voice branch based only on matching filenames.

### Authentication and voice code review
- Candidate `src/App.tsx` mounts `CloudAccess`; without a restorable tab session the access panel initializes expanded. The sign-in and recovery flows are present for existing accounts.
- Browser token storage is volatile by default. An optional same-tab `sessionStorage` restore exists. The native secure-token adapter is present but is not yet wired to a real Capacitor/iOS Keychain plugin. Persistent native sign-in is therefore still a mobile deliverable.
- Cloud STT sends captured audio to the authenticated API with an instruction to detect language automatically and preserve Portuguese/English switching. Cloud TTS is instructed to speak Brazilian Portuguese or neutral British English according to the text. The browser SpeechRecognition fallback uses one configured locale (pt-BR by default); do not confuse that fallback with cloud auto-detection.
- These code paths passed automated CI but have not passed physical iPhone microphone, speaker, background/foreground, account-switch or session-persistence tests.

### Live Supabase state (read-only inspection)
- Project `Jarvis` is `ACTIVE_HEALTHY` in `eu-west-3`.
- Production `jarvis-api` is active at version 32; `jarvis-preview-api` is active at version 11.
- Eleven migrations are recorded in the live project.
- Aggregate counts: 2 Auth accounts, 13 conversations, 42 messages, 1 memory-preference row and 0 memory-fact rows. One account has retrieval and pending-only auto-capture enabled; the other remains default-off. No accounts or rows were changed by this audit.
- Security advisor: informational RLS-enabled/no-policy finding for `jarvis_rate_limits` (review whether this server-only table should remain inaccessible to clients); warning that leaked-password protection is disabled. No Auth settings were changed.
- Performance advisor reports 18 unused indexes. Do not drop them during consolidation; usage history is currently too small to justify destructive tuning.

### Cloudflare, Oracle and FreeLLMAPI
- Connected Cloudflare account is accessible, but live inventory currently shows **zero** Cloudflare Tunnels, Workers scripts, D1 databases and zones. The Cloudflare prototype in the private repository is documentation/code only; its runbook explicitly says no Worker or D1 resource has been provisioned.
- Oracle Cloud state cannot be inspected through the currently connected tools. Do not claim the VM exists, is running, or hosts FreeLLMAPI until its instance state is verified through Oracle access or the user.
- The FreeLLMAPI branch prototype is loopback-only and intended for a local bridge. The cloud/iPhone model router is a separate HTTPS provider interface. To use FreeLLMAPI as the cloud brain, it needs a deliberate secure cloud-hosting design (e.g. the Oracle VM plus authenticated HTTPS ingress) and a provider adapter; simply copying the local key or exposing port 3001 is prohibited.
- The private `jarvis-personal-cloud/work/intelligent-memory-next` branch is 276 commits ahead of its main and contains 49 changed files, including a separate Cloudflare Worker/D1 memory prototype. Its AES-256-GCM envelope and key-provider contracts are useful security research, but its own review states that no real OS vault/secret-manager adapter, production key rotation/recovery, or upstream runtime integration exists. Do not deploy that store or delete its repository until its unique security findings/tests have been preserved and reconciled with the chosen Supabase memory architecture.

### Remaining product gaps — must stay visible
1. Native iOS app (Capacitor build, real Keychain storage, audio lifecycle, push notifications and background behavior) is not delivered; PWA is not the final mobile product.
2. Cloud-side approval records, exact-argument approval UI, notification/deep-link flow and execution audit are not yet implemented end-to-end.
3. Observer is read-only. It can detect/report bounded system health; it does not yet autonomously write code, run a controlled repair branch, test it, or prepare a human-reviewed release.
4. FreeLLMAPI is not yet integrated as the cloud/iPhone model gateway; Oracle VM status and secure ingress are unverified.
5. External adapters (WhatsApp, email, calls, BMW, maps, Blink, Dreame) remain capability-by-capability integrations. iOS restrictions and vendor APIs must be respected; no unrestricted access to every app is possible.
6. Persistent native sign-in and physical iPhone voice/account-isolation E2E remain release gates.

### Next execution sequence
1. Update PR #12's description with CI #800, Observer #49 and the READY deployment; retain Draft status.
2. Finish a file/commit-level migration matrix for PR #1/#4/#7/#8/#9, the FreeLLMAPI branch and the private memory workbench. Mark each item as migrate, superseded, documentation-only, or retire; preserve unique tests before closure.
3. Build a cloud-native approval service/UI rather than transplanting local-bridge approval primitives into the cloud client.
4. Implement the iOS shell and Keychain adapter, then ask for one bounded physical-device test only after a verified preview/native build is ready.
5. Design the Oracle-hosted FreeLLMAPI ingress only after verifying the actual VM and account resources. Keep Cloudflare optional until there is a real tunnel/domain need.
6. Promote to `main` only after the complete migration matrix, full CI on the final head, iPhone E2E, database/RLS review and release review pass.
7. Close PRs and delete branches only after their unique commits/tests/docs are either migrated or explicitly marked superseded. Retire `jarvis-personal-cloud` last, after its unique work is preserved in this one master record.

**Current truth:** one candidate integration branch, one central ledger, a successful full CI run and a ready preview now exist. The project is not yet consolidated onto `main`; no branch or repository has been deleted, and no production promotion has occurred.


## 18. Mobile recording review and cloud-status correction — 2026-11-13

### iPhone screen recording (2026-11-12, 30.5 seconds)
- The recording opens the Vercel-hosted JARVIS PWA in iPhone Safari.
- It shows a staged boot sequence: initial circular initialization screen, system-1 startup progress, a JARVIS emblem, then the amber/orange orbital HUD.
- The HUD renders and animates continuously for the remainder of the recording. At the end, the iOS Control Center is opened and a J.A.R.V.I.S. control tile is visible.
- This is useful evidence that the hosted page loads and the visual HUD animates on the iPhone. It does **not** prove sign-in, cloud conversation, microphone capture, TTS playback, background audio, push notifications, or native-app/Keychain behavior; none of those interactions is demonstrated in this clip.
- Follow-up device test should focus on actual login with the existing account, one Portuguese voice turn, one English voice turn, spoken response playback, app background/foreground, and sign-out/account isolation. Do not ask the user to create another account.

### Cloud connection-status correction
- Updated `src/lib/brain.ts`: a signed-in cloud session no longer reports a live connected brain or a live SYSTEMS rail service label. The cloud API is stateless HTTPS; authentication proves identity only. Persistent live connectivity remains reportable only for the local bridge socket.
- Updated `tests/brain-cloud-selection.test.ts` to assert the cloud connection indicator remains false/empty both while an authenticated cloud brain is selected and after sign-out.
- These changes are on `work/jarvis-canonical-integration`; a fresh full CI run must pass on the new head before the correction is considered validated.


## 19. CI regression repair — 2026-11-13
- CI #803 failed only because `tests/cloud-default.test.ts` still expected the obsolete label `CLOUD SIGN-IN REQUIRED`. The implementation deliberately no longer claims a stateless HTTPS cloud API is connected before a request has succeeded. Updated the test expectation to an empty live-connection label list; authentication remains separately visible in Cloud Access.
- All other 207 tests in that run passed or were skipped as configured. CI #803: https://github.com/laurofiorenzani/jarvis/actions/runs/43379063821
- Observer Validation #52 passed on the same candidate head. Re-run the full CI after this test correction before treating the branch as green.
- Mainline comparison has narrowed to 3 commits on `main` not yet in the candidate and 517 candidate-only commits. Preserve and explicitly reconcile those 3 mainline commits before changing PR #12's base or promoting to `main`.


## 20. Multi-branch reconciliation checkpoint — 2026-11-13 06:35 Europe/Dublin

### Latest exact-head verification
- Candidate head: `7b24f2c52c180f9deef10598c56fb6a6c4f48c4e`.
- Full CI #804: **SUCCESS** on that exact SHA — https://github.com/laurofiorenzani/jarvis/actions/runs/43379408618
  - typecheck and production build;
  - all 208 tests (205 passed, 2 skipped, 1 previously stale assertion fixed);
  - lint;
  - Deno provider privacy and semantic-memory policy tests;
  - Supabase Edge Function typecheck;
  - isolated Supabase startup, all migrations, SQL account-isolation tests and authenticated semantic-memory API test with two isolated users;
  - production API/CORS and canonical-preview CORS smoke tests.
- Observer Validation #53: **SUCCESS** on the same SHA — https://github.com/laurofiorenzani/jarvis/actions/runs/43379408649
- Vercel deployment for the same SHA: **READY**, alias `https://jarvis-git-work-jarvis-canonical-integration-lauro-fiorenzani.vercel.app`. This is a Preview, not production.
- The failed CI #803 was a stale assertion in `tests/cloud-default.test.ts`; corrected it to reflect the new truthful cloud connectivity contract. No application feature was disabled to make the test pass.
- PR #12 remains OPEN and DRAFT, with base `work/intelligent-memory-foundation`. It has not been merged or promoted.

### Mainline-only commit audit — all three reconciled by decision
The three commits present on `main` but absent from the candidate were inspected individually:
1. `1a963651` added the first CloudAccess UI with a cloud speech adapter callback. Its behavior is superseded by the more complete candidate CloudAccess and voice wiring.
2. `e18151ca` reverted the cloud speech adapter callback pending review. This is a rollback, not a feature to restore; the candidate includes the tested cloud STT callback.
3. `da4e4591` deleted CloudAccess from the main preview to fix an orphaned import/build issue. The candidate restores CloudAccess as an actual mounted, authenticated UI, rather than reviving the orphaned state.
Decision: do not cherry-pick those three commits. The candidate contains the intended functionality with the current amber interface and passing CI. Their rationale is preserved here.

### All 19 canonical-repository branches inventoried and compared against the candidate
- `main`: production default branch; three mainline-only commits above must be superseded by the final integration before promotion.
- `work/jarvis-canonical-integration`: canonical integration candidate; retain until final release.
- `work/memory-integration-ready`, `work/intelligent-memory-foundation`: ancestors in the cloud-first/semantic-memory PR stack; retain until the final candidate is merged.
- `work/jarvis-amber-command-center`: its observer, command-center, experience vision and HUD changes are included in the candidate; eligible for retirement after final verification.
- `work/jarvis-amber-production-track`: current amber UI lineage is included; unique local-bridge approval primitives and SSE helper/tests are not copied blindly. Their useful approval semantics are documented for cloud implementation; the cloud client already has a typed SSE reader with size bounds and cancellation.
- `work/jarvis-voice-locale`: cloud STT/TTS, language-aware prompts and account-switch guards are represented in the candidate; preserve until physical-device tests pass.
- `work/jarvis-cloud-status-accuracy`: cloud status semantics are now in candidate code and regression tests.
- `work/self-evolution-engine-foundation`: observer, privacy-bounded telemetry, triage and tests are included; its current observer is read-only, not an autonomous code-writing agent.
- `work/mobile-companion`: cloud API and mobile architecture material is present; actual Capacitor/iOS app remains pending.
- `fix/auth-invite-password-recovery`: compared the unique auth/UI/tests; candidate has invite/recovery, password setup, resend confirmation and a stricter no-duplicate-account sign-in UI. The candidate's auth code is newer; no CREATE ACCOUNT action is exposed.
- `feature/live-vision`: its camera/live-vision architecture note is present in the candidate; no live vision capability is claimed as shipped.
- `feature/gemini-live-voice`: entirely behind the candidate with no candidate-relative unique file changes; stale/superseded.
- `fix/restore-main-preview-build`: candidate-relative compare reports no unique file changes; stale/superseded.
- `work/jarvis-master-record`, `work/remove-shortcut-architecture`: earlier continuity/architecture snapshots; the single updated `JARVIS_MASTER_RECORD.md` and README pointer supersede their record copies.
- `feature/intelligent-memory`: 17 unique commits/7 changed files containing an older local bridge memory runtime. Superseded as the runtime architecture by account-isolated Supabase semantic memory, but unique tests/design must be reviewed and captured before branch deletion.
- `work/memory-integration`: 148 unique commits/42 changed files with encryption/key-provider, backup, audit and memory-approval prototypes. Do not merge into the active Supabase store or delete until a security review extracts and records any reusable protections; the D1/bridge implementation is not the production memory architecture.
- `work/freellmapi-backend-prototype`: 32 unique commits/21 files, a local loopback bridge adapter. Keep as research until its provider policy, tool loop and tests are reviewed; it is not the cloud/iPhone FreeLLMAPI integration.
- `work/jarvis-amber-production-track` also contains local bridge action-approval code. Its canonical argument hashing, fail-closed risk classification, short TTL, one-use approval, and session cancellation are useful invariants, but the in-memory Node registry cannot be used as the cloud production approval service.
- The branch list was paged to completion (19 branches); no branch has been deleted.

### PR dependency stack and safe consolidation rule
- PR #1 (cloud-first foundation) -> main; head CI #487 passed.
- PR #4 (semantic memory) -> PR #1 branch; head CI #668 passed.
- PR #12 (current amber interface + auth + voice + semantic memory + observer) -> PR #4 branch; current full CI #804 and Observer #53 passed.
- PR #7/#8/#9 form a separate amber/voice/status stack; their unique changes are covered by the candidate or explicitly recorded as non-production local-bridge research.
- Do not merge intermediate PRs into production one by one: that could briefly replace the current amber interface or reintroduce the removed auth regression. Keep production untouched; after the remaining migration review and iPhone test, consolidate the complete tested candidate in one controlled mainline release.
- No branch or repository is deleted until every unique item is classified as migrated, superseded with evidence, or deliberately retained as research.

### Remaining work before mainline release
1. Review the unique 7-file `feature/intelligent-memory`, 42-file `work/memory-integration`, and 21-file FreeLLMAPI prototype; extract useful security/test knowledge into the single master record and selected production implementation.
2. Complete the iOS native app: Capacitor project, real Keychain plugin, audio lifecycle, push notifications/haptics and signed build; PWA preview is not the native app.
3. Implement cloud-side approval registry/UI/notifications/execution; local bridge approval prototypes are not sufficient.
4. Implement a bounded self-evolution development agent (proposal -> isolated branch -> tests -> review); observer remains read-only.
5. Verify Oracle VM status and secure ingress before deciding whether FreeLLMAPI can be hosted there. Current Cloudflare account inventory shows no tunnel, Worker, D1 or zone.
6. Verify real authenticated provider inference and physical iPhone PT/EN STT/TTS, account switching, session persistence and app lifecycle.
7. Retarget the complete candidate to `main` only after the unique branch review and device/release gates pass; then remove redundant PRs/branches and finally retire `jarvis-personal-cloud` after its unique research is preserved.

**Current state:** CI and observer are green on the candidate, and its preview is READY. The project is not yet merged to `main`; production remains unchanged. This master record is the only authoritative progress/decision ledger.


## 21. Single-ledger consolidation of old decision/status documents — 2026-11-13

The older `docs/PROJECT_DECISIONS.md`, `docs/architecture/IMPLEMENTATION_STATUS_2026-11-10.md`, and `docs/LOGIN_AND_PWA_SETUP.md` were reviewed. Their durable decisions and still-relevant evidence are consolidated here; they are stale snapshots and are being retired from the candidate so there is one authoritative decision/progress file.

### Product and architecture decisions carried forward
- JARVIS is the only assistant and user-facing control surface. No Apple Shortcuts, Siri Shortcuts, automations that require the user to switch apps, or manual shortcut workflows are part of the product architecture.
- Cloud-first operation: ordinary chat, memory, voice and supported integrations must work without the Windows PC or a local bridge. The local bridge remains optional developer/desktop capability only.
- The current amber holographic interface is the sole intended interface. The previous interface must not be restored.
- The iPhone deliverable is a standalone native iOS app with its own icon and lifecycle. This supersedes the older 10-Nov decision that approved PWA as a release fallback. The web preview/PWA is useful for development and browser testing only; it is not the final mobile deliverable.
- Native iOS permissions and Apple policy constrain what can be accessed. JARVIS must use supported APIs, notification permissions, user-granted access and vendor integrations; do not promise unrestricted reading/control of every app or arbitrary CarPlay mirroring.
- Start with a continuous assistant conversation and reliable multilingual voice (Portuguese/English plus language-aware handling); then progressively add capabilities through the same JARVIS conversation.
- Use the existing Supabase Edge Function provider router with server-side secrets and approved free-tier HTTPS providers for the zero-cost two-user prototype. FreeLLMAPI's current dashboard/local prototype is single-user and loopback-oriented; do not expose it as a public multi-user service. Keep it local-only unless a free, persistent, private hosting and multi-user security design is proven.
- No paid services, credits, upgrades, billing changes, paid hosts or new vendor subscriptions without explicit cost review and approval. Never expose provider/vendor credentials in browser bundles, Git, ChatGPT, logs or this ledger.
- Personal/project memory stores explicit approved decisions/facts with provenance and timestamps; it must not indiscriminately ingest every conversation or secrets. Retrieval and auto-capture are separate per-user opt-ins, default off. Each account remains isolated.
- Durable project continuity requires the versioned master ledger plus user-owned cloud project memory. Do not claim runtime recall until records are seeded and a fresh conversation successfully retrieves them.

### Auth, memory and provider implementation evidence
- Current candidate CloudAccess supports existing-account password sign-in, session restoration, sign-out, resend confirmation, invite/recovery password setup and no public account-creation action. The two existing Supabase accounts must be preserved; do not recreate them.
- Browser tab-session restore is tab-scoped `sessionStorage`, not secure cross-device/native persistence. The native token adapter is not yet wired to a real iOS Keychain plugin.
- Auth redirect handling accepts the exact production and stable integration-preview origins and rejects arbitrary Vercel preview/lookalike origins. Supabase Auth dashboard redirect allowlist must still be verified to contain those exact URLs; no dashboard setting was changed in this audit.
- Provider status is configuration metadata, not proof of a live model request. The next real authenticated inference must be tested; provider diagnostics must distinguish 404 model/endpoint, 401/403 auth/access, 429 quota/rate limit, upstream 5xx and other request errors. Never mislabel all failures as quota exhaustion; logs must redact keys and never log prompts or raw credentials.
- OpenRouter ZDR/privacy notes from the old decision ledger are preserved as a security constraint: verify account-level ZDR-only/Safety Retention settings and data-region requirements before private family content is sent. A request-level ZDR flag alone is not sufficient proof of strict zero retention. The documented OpenRouter Free route is quota-limited and not EU-only; do not send data that requires EU-only processing. Do not add paid credits.
- Cloud semantic-memory retrieval injects only a bounded set of approved, non-expired, user-scoped facts when that user's context preference is enabled. Current live counts remain two Auth users, 13 conversations, 42 messages, one preference row and zero saved memory facts.
- The `jarvis_rate_limits` table is server-only: no anon/authenticated grants or client policies; do not add client access. Leaked-password protection was reported disabled by the Supabase security advisor; enabling it requires a deliberate Auth-setting review and has not been changed.
- The old local encrypted memory runtime (AES-256-GCM, injected OS-vault key provider, atomic key creation, encrypted backups, metadata-only audit, one-shot approvals) is valuable security research, but it is disabled/local-only and not a multi-user cloud database. Reuse its cryptographic/key-lifecycle/audit invariants only after a cloud-compatible key-management design and tests exist.

### Retired duplicate files
- `docs/PROJECT_DECISIONS.md`: superseded by this section and the master record.
- `docs/architecture/IMPLEMENTATION_STATUS_2026-11-10.md`: dated implementation snapshot; its auth/voice/provider status is stale relative to the current candidate.
- `docs/LOGIN_AND_PWA_SETUP.md`: old instructions incorrectly say no accounts exist and encourage account creation/PWA installation; no longer appropriate for the current two-account/native-app decision.
- Architecture specifications and vendor/mobile design documents remain as supporting technical references, not competing progress/decision ledgers. README continues to point to this master record as the single source of truth.


## 22. Private workbench and provider prototype audit — 2026-11-13

### `jarvis-personal-cloud` is a research workbench, not a second production app
- The private repository still exists. Its `work/intelligent-memory-next` branch is 276 commits ahead of its `main`, with 49 changed files. Memory MVP CI #144 passed on commit `3a43b5aed50e0ac3392a25ef99d5a526ca8049b4`.
- The branch contains a Cloudflare Worker/D1 household memory API prototype, encrypted memory/key lifecycle code, confirmation and audit flows, synthetic tests, and detailed architecture/security research.
- Live Cloudflare account inventory remains zero Workers scripts, zero D1 databases, zero Access apps/tunnels/zones discovered by the connected account. The branch's own runbooks state no Cloudflare resource was provisioned. All code and test data are prototypes; no family records were stored there.
- The Cloudflare design is a competing identity/data plane (Cloudflare Access + D1), whereas the existing live JARVIS system already uses Supabase Auth, Postgres/RLS and deployed Edge Functions. Do not introduce a second production memory database or require a second login. Keep Supabase as the canonical cloud data plane unless a measured requirement proves otherwise.

### Reusable security research extracted from the private workbench
- Worker identity: validate Cloudflare Access edge-injected JWT signature, issuer, audience, expiry, not-before, subject and verified email; map issuer+subject to a provisioned user. Never trust a browser-supplied user ID or a shared household token.
- Memory encryption: AES-256-GCM with a fresh 96-bit IV and 128-bit tag; strict canonical Base64; versioned keyring; authenticated additional data binds household, owner, memory ID, visibility, payload version, key version, type, retention deadline and sensitivity. Tampering with classification/retention metadata must fail decryption.
- Key rotation: scheduled re-encryption with compare-and-swap on key version, payload version, timestamp and ciphertext to avoid overwriting concurrent user edits. This is synthetic SQLite/Worker test evidence, not live D1 validation.
- Mutation approval: one-use, short-lived confirmation token bound to actor, operation, target and canonical payload digest; consume atomically before a mutation; reject replay/wrong user/changed arguments. Audit events contain metadata only.
- Retention and abuse controls: private-by-default memory, owner-only mutations, bounded request bodies, per-user rate limiter required/fail-closed, expiring confirmation cleanup, audit retention and encrypted export/backup plans.
- Local encrypted-memory branch adds AES-256-GCM envelopes, 32-byte key-provider contract, atomic create-if-absent, fail-closed missing-key behavior for existing stores, encrypted backups, metadata-only audit, serialized writes, restrictive file permissions and atomic rename.
- Important blocker: no real Windows Credential Manager/DPAPI, macOS Keychain or cloud KMS adapter exists in the private workbench; its tests use fake/in-memory vaults. Do not use the local file store with personal data or treat its contract as a deployed key vault.
- The Cloudflare Worker code is not production-ready: no deployed Access/Worker/D1, no real identities, no browser approval UI, no production backup/restore test, no deployed rate-limit verification, and no complete runtime/voice/vendor integration. The Worker CORS/Access preflight interaction is specifically documented as unresolved.
- Decision: carry the above invariants into the Supabase cloud approval and memory designs where applicable. Do not migrate the Worker/D1 implementation, duplicate tables, credentials, or identity system. The private repository can be retired only after this record and the selected code/tests contain all reusable requirements and the remaining branch inventory is signed off.

### FreeLLMAPI prototype review
- `work/freellmapi-backend-prototype` adds an OpenAI-compatible streaming client, tool-call fragment accumulator, sequential MCP tool loop, explicit stdio MCP server allowlist, and reuses the local bridge workspace/file-root policy.
- Its default endpoint is `http://127.0.0.1:3001/v1`; non-loopback endpoints must be HTTPS. The MCP session adapter explicitly rejects remote HTTP/SSE MCP transports at this stage and requires configured local stdio commands.
- Therefore it is a local Node bridge adapter, not a cloud-hosted/iPhone service. Exposing the local FreeLLMAPI dashboard/API or moving its key into the browser would violate the multi-user/cloud security boundary. It must not be deployed as the cloud brain without a separately reviewed HTTPS service, per-user auth, secret isolation, tool policy, rate/cost limits and verified free/private hosting.
- The existing Supabase model router remains the chosen cloud provider gateway for the zero-cost prototype. Actual provider inference still needs a real authenticated turn and privacy/quota verification.

### Repository retirement decision
- The private `jarvis-personal-cloud` repository is not the canonical application repository. Its role is research only; its useful security requirements have now been consolidated in this master ledger.
- Do not delete it until the final check confirms no open PR, deployment, automation or unique test is still needed. Once that check passes, retire it rather than continuing parallel development there.


## 23. Latest verification and mobile-test handoff — 2026-11-13

- Final current candidate before this ledger update: `060ba2343a99a011d679165d8ea7857dd152dc58`.
- Full CI #807: **SUCCESS** on that exact SHA — https://github.com/laurofiorenzani/jarvis/actions/runs/43380176138. This includes build/typecheck, all Node tests, lint, Deno tests/checks, isolated Supabase migrations and two-user isolation tests, and deployed production/preview CORS smoke checks.
- Observer Validation #56: **SUCCESS** on the same SHA — https://github.com/laurofiorenzani/jarvis/actions/runs/43380176125.
- Vercel Preview for the exact SHA is **READY**: `https://jarvis-git-work-jarvis-canonical-integration-lauro-fiorenzani.vercel.app`. No production alias or production deployment was changed.
- Supabase read-only inspection confirms two existing Auth users. Exactly one account currently has `context_enabled=true` and `auto_capture_enabled=true`; the other is false/false. The semantic facts table contains zero facts. Auth metadata has no display name, so do not guess which account owns the opt-in. Do not seed or approve project facts into either account until the account owner is confirmed in an authenticated session. The app already has a pending-candidate review surface with explicit approve/reject; automatic capture must remain pending until the user approves each candidate.
- The three outdated decision/status/setup documents were removed from the candidate tree after their durable decisions were copied into this master record. The README links to this file. Technical architecture/runbook documents remain supporting specifications, not competing progress ledgers.
- No production Supabase users, passwords, auth settings, secrets, database rows, or production Edge Functions were modified during this consolidation pass.
- PR #12 remains OPEN/DRAFT and stacked on `work/intelligent-memory-foundation`. The final candidate has not been merged to `main`; the current production UI is untouched.
- No branch or repository has been deleted. All work-bearing branches and the private memory workbench are preserved until their unique contributions and release dependencies are fully closed. The connected GitHub actions available in this session do not expose branch-ref or repository deletion, so cleanup must be performed through an authorized GitHub interface after final integration, not simulated by deleting source files.
- The one required external validation before the next release gate is a real iPhone Safari test of the stable Preview: existing-account login, Portuguese and English microphone transcription, and spoken response. This cannot be truthfully certified by CI or a Vercel READY state.


## 2026-11-13 — iPhone login false-expiry root cause and correction

- The iPhone Safari request logs show repeated unauthenticated GET requests to /functions/v1/jarvis-preview-api/v1/health with HTTP 401 immediately after the preview was opened. The preview function is mounted as jarvis-preview-api, while the Edge handler previously stripped only the hard-coded /jarvis-api marker.
- This caused the public health route to miss its health-route match and fall through to the bearer-token guard. During sign-in, CloudAccess obtains the session and then calls activateRuntime(); brain.warm() calls the health endpoint, so the 401 is surfaced as “session expired” even though the user has just entered credentials. This explains the misleading UI message; it is not evidence that a new account is needed.
- Corrected supabase/functions/jarvis-api/index.ts on work/jarvis-canonical-integration to strip the actual Supabase function mount generically, covering both production and preview slugs. Commit: 2b5bb37abd6c427b44c8139d421f4f76cb08c167.
- This is a source/PR change only. It has not been deployed to Supabase production and no account, password, session, auth setting, or production data was changed.
- Required validation: exact-head CI and Observer checks, new Vercel preview, and then physical iPhone sign-in again. After that, confirm authenticated health, conversation creation, PT/EN STT and TTS. Keep PR #12 Draft and do not promote to production until these gates pass.


## 2026-11-13 — follow-up after iPhone screenshot (health route and Preview CORS)

- The latest iPhone screenshot shows the sign-in form remains visible and the message is now “Cloud service could not be reached.” This is different from the earlier “session expired” message and indicates activation is failing during the post-login health request, not proof that credentials are wrong.
- Supabase request logs for the iPhone showed GET /functions/v1/jarvis-preview-api/v1/health reaching Edge Function version 12 with HTTP 401 at 06:50:38 Dublin time. The first route-normalization change was therefore insufficient.
- Added an explicit public health-route match for any mounted function path ending in /v1/health, then deployed jarvis-preview-api v13.
- Also found that every immutable Vercel Preview gets a new hostname. Added a narrowly scoped CORS rule accepting only HTTPS hosts matching this Jarvis project's Vercel deployment naming pattern (jarvis-…-lauro-fiorenzani.vercel.app), not arbitrary Vercel origins. Deployed jarvis-preview-api v14.
- Production jarvis-api remains v32 and has not been deployed or modified. No Auth accounts, credentials, production data, or Auth settings were changed.
- Current code commits: route match 53c200a3f34b18b6da16926622bb3e7a45f5f2c6; Preview CORS 25bd55b45a2a2676a3bed7f4d40a0a454eefae92. Require a new Preview build and verify OPTIONS/CORS + GET health returns 200 before asking for another iPhone retest. PR #12 remains Draft.


## 2026-11-13 — CORS bootstrap fix after repeated iPhone failure

- The latest iPhone health request reached `jarvis-preview-api` v14 and returned HTTP 200 at 06:53:12 Dublin time. This proves the public health route itself now executes successfully.
- The Edge log response headers did not include `Access-Control-Allow-Origin`; the browser therefore could still reject the cross-origin response and surface `Cloud service could not be reached` despite HTTP 200.
- Corrected the bootstrap health endpoint to return `Access-Control-Allow-Origin: *` because it exposes only a non-sensitive health status. Its OPTIONS preflight now returns narrowly scoped GET/OPTIONS headers. Authenticated API routes retain their restricted CORS handling and bearer-token requirement.
- Also corrected the Jarvis Preview hostname matcher to use a literal escaped dot in the regex.
- Deployed `jarvis-preview-api` v16. Production `jarvis-api` remains v32 and was not changed. No account/auth data or secrets were modified.
- New Vercel Preview for commit `3ccda6096cceaf14a9810db54e4a5250dea0f033` is building; do not retest until it is READY. Verify health CORS response and authenticated follow-up before requesting another device test.


## 2026-11-13 — iPhone authenticated API route normalization

- The 06:58 iPhone Safari logs prove authentication is now successful: requests carry a valid Supabase `authenticated` JWT and user subject; `/v1/health` returns HTTP 200 on Preview function v16.
- The screenshot's remaining “Não consegui processar esta mensagem” is downstream of login. Authenticated GET requests to `/v1/conversations`, `/v1/memories`, and `/v1/memory-preferences` were reaching Preview function v16 but returning HTTP 404. No credential reset or duplicate account is indicated.
- Updated route normalization to extract the route suffix after the final API `/v1/` segment, accommodating Supabase Edge Runtime path variants without depending on a specific function slug. Commit: `5da0146c858ab57b8a4087c45d0779ddee4d664d`.
- Deployed this handler to non-production `jarvis-preview-api` v17 only. Production `jarvis-api` remains v32. No Auth accounts, credentials, production data, secrets, or production functions were changed.
- Vercel Preview for the code commit is READY: `https://jarvis-b1ctjg3in-lauro-fiorenzani.vercel.app`. CI #817 and Observer #66 are running; do not treat runtime route behavior as verified until exact-head CI and an authenticated device/API check pass.
- Next check: observe fresh authenticated iPhone requests on v17. If 404 persists, add a temporary safe diagnostic for the actual handler pathname and normalized route candidates before any further route changes. Keep PR #12 Draft.


## 2026-11-13 — speech pipeline and CI route regression correction

- Latest iPhone logs from 07:01–07:02 Dublin confirm the previous Preview v17 now returns HTTP 200 for authenticated GET `/v1/conversations`, `/v1/memories`, `/v1/memory-preferences`, `/v1/semantic-memory/candidates`, and `/v1/provider-status`. The iPhone also POSTed `/v1/stt` twice and received HTTP 200. No `/v1/turns` or `/v1/tts` calls were observed in that capture window, consistent with speech requests returning empty transcripts before a turn was emitted.
- The STT handler previously returned HTTP 200 with an empty transcript for every audio segment smaller than 1,200 bytes. This can silently discard short utterances on iOS Safari. Reduced the near-empty cutoff to 256 bytes, logging only byte count and MIME type for truly tiny segments; audio itself and transcript contents are never logged.
- CI #818 exposed a local Supabase route regression: the normalizer treated the first `/v1/` in `/functions/v1/jarvis-api/...` as the API version and derived `/jarvis-api/...`, causing `/memory-preferences` to return 404 in local integration tests. Changed route normalization to prefer the suffix after the actual function mount and strip the optional API version there.
- Both corrections committed together as `e49d8bb84001441a20e4532bdbcc50aec8e45129` and deployed to non-production `jarvis-preview-api` v18 only. Production `jarvis-api` remains v32, untouched.
- CI #819 and Observer #68 are running for the exact commit. Vercel Preview is building at time of record: `https://jarvis-8nsnptv74-lauro-fiorenzani.vercel.app`. Do not request another iPhone test until Preview is READY and CI verifies the local semantic-memory integration.
- PR #12 is being moved from Draft to Ready for Review at the user's explicit request. It remains stacked on `work/intelligent-memory-foundation`; it is not yet a production release or merged to `main`.
- Remaining gates: verify actual non-empty PT/EN STT transcript, conversation turn response, and TTS playback on iPhone; then run full release checks and consolidate stack safely. No production account, auth config, secrets, or data changed.


## 2026-11-13 — V1-first priority and parallel audit

### Product priority reaffirmed by owner
- The immediate delivery is a usable JARVIS app on the phone and desktop, cloud-first and available without keeping the owner's computer running. Do not delay this first release while completing the later self-evolution engine.
- JARVIS is an executive personal assistant / Chief of Staff, not merely a chat UI: it should have a distinct, context-aware and naturally variable personality; proactively prepare concise operational briefings; coordinate authorized email and messaging drafts; track follow-ups and commitments; and support a Family-CFO workflow for budgets, mortgage planning, reserves and investment research.
- The assistant should propose and execute bounded routine tasks only under narrowly pre-authorized scopes. External communications and consequential, financial, security, destructive or irreversible actions pause for exact, explicit approval inside JARVIS. A generic autonomy request is not blanket approval.
- The full self-improvement/development agent remains a later phase. Preserve the observer/branch/test/review architecture, but do not make autonomous code changes a prerequisite for V1.
- Existing account separation, amber HUD, no-Shortcuts rule, cloud-first operation, free/approved provider constraints and no production mutation without approval remain unchanged.

### Parallel repository audit — verified findings
- Current PR #12 head before this audit: `dead059e050114a362e23cece100a16cec527022`; PR #12 is OPEN and Ready for Review, stacked on `work/intelligent-memory-foundation`. It is not merged to `main`.
- PR #7 remains the amber UI baseline at `ae4e9d3f775929b0fb3e1b34048fb66fe21aaa7c`, OPEN/DRAFT. PR #8 and #9 remain separate voice/cloud-status layers; PR #4 and #1 remain cloud/memory stack dependencies. Do not treat the PR list as one integrated release.
- GitHub compare of the PR #7 amber head against the PR #12 candidate reports `diverged`, 535 commits ahead and 212 behind. This is a hard prohibition on blind merge/fast-forward. Reconcile by feature and exact file/test evidence.
- PR #12 exact-head CI run `43386058676` failed only at the final `supabase stop --no-backup` teardown step. The preceding typecheck/build, unit tests, lint, provider privacy tests, semantic-memory policy tests, Edge Function type-check, local migrations, SQL isolation tests (12 assertions) and authenticated semantic-memory integration tests for two isolated users all passed. The Observer Validation run `43386058876` passed. This is not a functional-test failure, but the CI result was red and must be corrected transparently.
- Fixed the CI teardown step so a failed cleanup of ephemeral local Supabase containers emits a warning rather than invalidating completed validation. The hosted GitHub runner is ephemeral and reclaims remaining containers. Change committed as `208500d4310ae5bfc2f887c74b6025acce5c1c4c` on `work/jarvis-canonical-integration`. A fresh exact-head CI run is required; do not mark the pipeline green until GitHub reports success.
- Tree inspection confirms the current canonical integration candidate contains no Capacitor dependency/configuration or generated iOS project. Native iOS packaging, Keychain plugin wiring, signed build and TestFlight remain unimplemented. The responsive web app is the available phone/desktop test surface; physical iPhone Safari validation is still required.
- Product/integration documents describe the intended executive assistant, approvals and vendor integrations, but they are specifications, not proof of shipped functionality. No server-side vendor integration registry, verified BMW/Blink/Dreame control, WhatsApp access, or Family-CFO execution was proven in this audit.
- No branches, repositories, production deployments, production functions, user accounts, auth settings, secrets or production data were deleted or modified in this audit.

### Next parallel work queues
1. **Release/CI:** validate the new exact-head CI and observer runs; inspect any remaining failing step logs; keep the PR unmerged until the integration base and release gates are reconciled.
2. **iPhone runtime:** use only the newest READY preview; verify existing-account login, authenticated conversation creation, non-empty pt-BR/en-GB STT, model turn and TTS. Do not ask for repeated device testing until CI and Preview smoke checks pass.
3. **Canonical integration:** produce a file/feature-level reconciliation of amber UI, auth, voice, cloud API, memory and status branches. No bulk merge.
4. **Executive assistant core:** map briefing/task orchestration, variable persona, action registry, approval queue and audit trail to concrete implemented code and tests; mark specifications separately from shipped features.
5. **Mobile delivery:** determine the shortest viable sequence from responsive web release to Capacitor/iOS without blocking the first usable phone release; native build still requires macOS/Xcode and physical-device validation.
6. **Cloud/provider:** verify the actual deployed FreeLLMAPI/Gemini route, provider secrets server-side, cloud runtime independence from Windows, and free-tier limits before any availability/cost promise.
7. **Memory and dual-account isolation:** continue exact-head RLS/API tests and validate both existing identities without modifying account data or enabling spouse memory by default.
8. **Integrations:** capability and permission audit for email, messaging, BMW, Blink, Dreame, lights and Maps; implement only through authorized direct adapters and report unsupported scopes honestly.
9. **Safety and operations:** approval lifecycle, cancellation, audit events, rate limits, backup/recovery, observability and rollback gates.
10. **Later self-evolution:** read-only observer and guarded isolated PR workflow after V1; no self-approval, merge or production deploy.

## 2026-11-13 — voice empty-transcript fix, preview deployment and exact-head validation

### Verified implementation change
- The iPhone Safari log window at 07:01–07:02 Dublin showed authenticated account/memory/provider-status requests returning HTTP 200 and two STT requests returning HTTP 200, but no subsequent turns or TTS request. The logs do not contain audio or transcript content, so the precise provider response cannot be reconstructed.
- Code inspection found a concrete silent-failure path: STT extraction defaulted to an empty string when Gemini returned no candidate text, then checked only whether transcript was a string. Because the fallback was already a string, the handler returned HTTP 200 with an empty transcript and the voice loop discarded it as unintelligible. This is consistent with the observed no-turn symptom, but is not claimed as the only possible cause.
- Fixed in commit 9d0b5f436b5a24ce2fd526180715d17645c7e1ea: extracted defensive provider-response parsing into speech-transcript.ts; empty/malformed provider transcripts now return a retryable 503 instead of false success; diagnostic logs contain only audio byte count, MIME type and candidate count, never audio or transcript content.
- Added speech-transcript_test.ts covering valid multi-part transcripts, missing/malformed candidates, non-text parts, whitespace and candidate counting. CI now runs this test explicitly.
- Deployed the exact candidate Edge Function source to non-production jarvis-preview-api version 19. Verified the deployed bundle contains route-path normalization and the empty-transcript guard. Production jarvis-api remains version 32 and was not changed.
- New Vercel Preview for commit 9d0b5f436b5a24ce2fd526180715d17645c7e1ea is READY: https://jarvis-mmq8qjks7-lauro-fiorenzani.vercel.app.

### Exact-head validation
- CI run #823, 43393414158, passed on exact code head 9d0b5f436b5a24ce2fd526180715d17645c7e1ea: dependency audit, TypeScript/Vite production build, app tests, lint, provider privacy tests, semantic-memory policy tests, Edge Function type-check, speech-transcript regression tests, isolated Supabase startup/migrations, SQL isolation tests, authenticated semantic-memory integration with two isolated synthetic users, teardown, production API/CORS smoke test and Preview CORS smoke test.
- Observer Validation run 43393414148 passed on the same exact head.
- These checks prove the automated code/database/API gates, not a physical iPhone microphone-to-model-to-speaker end-to-end test. Do not claim the new voice path is device-verified until a fresh iPhone session produces a non-empty transcript, a turn response and audible TTS.
- The prior teardown-only CI failure is resolved: the new full CI run completed successfully, including local Supabase teardown. No further cleanup workaround is needed.

### Branch/release regression diagnosis
- work/intelligent-memory-foundation is the cloud foundation PR #1 base: 454 commits ahead of main and 3 commits behind it. The three main-only commits include 1a96365176e83a2012ce99f926bf56ca2f354a14 (added CloudAccess), e18151ca3b6d959b3e07263894cbf124689dea54 (reverted its cloud speech adapter prop), and da4e4591a0fe364ba5823d44ee2954b88ffd3383 (removed CloudAccess.tsx). These changes explain why following mainline blindly would regress the cloud experience.
- PR #12 remains OPEN/Ready for Review and is stacked on work/intelligent-memory-foundation; it is not merged to main. PR #1 remains OPEN/Ready for Review against main. PR #7 remains OPEN/Draft as the earlier amber visual baseline. Keep the stack and reconcile features deliberately; do not bulk-merge the 537/212 divergent amber/canonical histories.
- No branches or repositories were deleted. No production deployment, production Edge Function, account, password, auth setting, secret, billing setting or production data was changed.

### Remaining release gates and honest limits
- Existing Supabase Auth account count remains two. The read-only count-only audit found one memory-preference row, one account opted into memory context/auto-capture, zero approved saved semantic facts, 13 conversations and 42 messages. The other account remains default-off. The automated two-user isolation test uses synthetic users and does not modify either existing account.
- The current cloud model router requires server-side JARVIS_MODEL_PROVIDERS configuration plus the referenced provider secret. The existing Google AI Studio key in the Windows FreeLLMAPI installation is not automatically available to Supabase. The available Supabase connector cannot inspect or create Edge Function secrets; actual cloud model inference therefore remains unverified and may require an owner-only Dashboard secret/configuration step. Do not claim the brain is live based only on successful build or STT.
- The Vercel Preview is a responsive web/PWA surface for iPhone and desktop; it is not a native iOS binary. Capacitor/Xcode project, Keychain integration, signed build and TestFlight remain unimplemented. Physical iPhone PT/EN STT, model turn and TTS validation remains outstanding.
- Free-tier hosting is not an unlimited or permanent always-on guarantee. Do not enable paid billing or paid fallback. The full self-evolution engine remains post-V1.


## 2026-11-13 — cloud voice/provider configuration audit

### Live verification
- Canonical integration branch compared with `main`: 539 commits ahead and 3 behind, with merge base `9ae5ec846b6b20a17b2d264e699d6234c4284b23`. The three main-only changes remain known CloudAccess/cloud-speech regressions; no bulk merge or fast-forward is safe.
- Latest recorded canonical documentation head before this audit: `2a6b39c917204d2f7ff1351d1400196e0472dbb7`. CI run #825 (`43393953499`) and Observer Validation #74 (`43393953674`) both passed. The exact-head Vercel deployment is READY at `https://jarvis-rbnwvqxvm-lauro-fiorenzani.vercel.app`; it is a Preview, not production.
- Supabase project remains ACTIVE_HEALTHY. `jarvis-preview-api` is ACTIVE v19; production `jarvis-api` remains ACTIVE v32. No production function, auth account, data, secret, billing or domain was changed.
- The last authenticated `GET /v1/provider-status` in logs was HTTP 200 at 07:01:49 Dublin on 13 Nov. This proves the endpoint responded, not whether a provider was configured or whether model inference succeeded. Later provider-status traffic at 08:26–08:35 consisted only of CORS preflight OPTIONS requests.
- STT logs show repeated upstream Gemini HTTP 429 responses from 10:50–10:58 on 12 Nov, followed by HTTP 200 STT responses at 07:02 on 13 Nov. No corresponding `/v1/turns` or `/v1/tts` requests followed those 07:02 STT requests. The 429 is consistent with throttling/quota limitation but does not reveal which Google quota caused it. Do not claim current PT/EN voice E2E success.

### Configuration mismatch found and corrected in documentation
- Cloud STT and fallback TTS both read the Supabase Edge Function secret `GOOGLE_AI_STUDIO_API_KEY`.
- The model router reads `JARVIS_MODEL_PROVIDERS`; each provider's `apiKeyEnv` selects the secret used for that provider. The prior Google AI Studio guide used the separate name `GEMINI_API_KEY`, unnecessarily requiring a duplicate key.
- Updated `docs/cloud/GOOGLE_AI_STUDIO_PROVIDER.md` to use `GOOGLE_AI_STUDIO_API_KEY` for the model router too, and clarified that this one secret can serve chat, STT and fallback TTS. Updated `.env.example` to describe the current cloud voice path accurately. These are documentation-only changes; no secret was read, created or changed.
- Cloud TTS is wired as a fallback after the browser's native speech engine fails; native browser speech remains the default. The cloud TTS endpoint is not proof of successful speech playback on a physical iPhone.
- Google AI Studio Free-tier data-use terms remain a consent gate: free-tier content may be used to improve Google's products. Do not route private prompts, personal records, voice transcripts or approved memories through that tier until the owner has reviewed and explicitly accepted the current terms. Do not enable paid billing or paid fallback.

### Remaining blockers and next gates
1. Owner-only Supabase secret access is still required to inspect or set `GOOGLE_AI_STUDIO_API_KEY` and `JARVIS_MODEL_PROVIDERS`; the available Supabase connector exposes no Edge Function secret-management action. Never request the key in chat.
2. After privacy/terms acceptance, confirm `GET /provider-status` reports a configured provider, then run one synthetic non-personal inference. A status response alone is not model inference proof.
3. Review the Google AI Studio quotas for the STT model after the logged 429s. Keep retry/cooldown behavior; do not create rapid retry loops.
4. Fresh iPhone E2E is still required: existing-account sign-in, non-empty PT-BR and EN-GB transcripts, a cloud model turn, and audible speech. Automated CI does not replace this test.
5. Persistent cloud action approvals/tool execution, vendor integrations, native Capacitor iOS app and full self-evolution remain unimplemented; their architecture/specifications are not shipped capabilities.


## 2026-11-13 — provider eligibility and Cloudflare Workers AI migration

### Google Gemini Free Tier decision
- Verified Google's Gemini API Additional Terms: API clients made available to users in the EEA, Switzerland or UK may only use Paid Services. JARVIS is accessed from Ireland and the owner requires zero paid API usage; Gemini Free Tier is therefore not an eligible cloud provider for this deployment. Do not configure or re-enable Gemini Free for chat, STT or TTS in the JARVIS cloud app.
- Removed the Gemini Free STT request from the Preview code path. The cloud TTS route now fails closed and CloudAccess no longer installs the Gemini TTS callback. Device-native speech remains the active TTS path. Do not send private text/audio to the previous Gemini Free routes.

### Cloudflare candidate verified read-only
- The connected Cloudflare account exposes the Workers AI model catalog. Current candidates: `@cf/google/gemma-4-26b-a4b-it` (256k context, function calling, reasoning and vision; explicitly listed by Cloudflare as Workers Free available), `@cf/zai-org/glm-4.7-flash` (131k context, function calling and reasoning; also listed as Workers Free available), and `@cf/openai/whisper` for multilingual STT. The model catalog also shows models that may require paid billing; catalog presence alone does not prove Free eligibility.
- Excluded `@cf/nvidia/nemotron-3-120b-a12b` because its model catalog lists planned deprecation on 20 Nov 2026. Excluded Qwen3.8 and Llama 3.3 from the Free candidate list because Cloudflare's current published Free-plan model notice does not list them.
- Cloudflare's current data-use documentation states that standard stateless Workers AI requests have zero data retention and Customer Content is not used to train AI models. Operational metadata may still be retained; model-specific third-party licenses apply. Do not use AI Gateway content logging/caching or stateful features.
- Workers Free provides 10,000 Neurons/day. Exhaustion returns HTTP 429/error 3036 until reset. Workers Paid also includes that allocation but bills usage above it. The account plan could not be verified because the connected Cloudflare OAuth scope lacks Billing Read; no inference request was sent and no usage was consumed by this audit.

### Code changes in this candidate
- Model router ZDR validation now accepts only the official OpenRouter ZDR endpoint or the exact Cloudflare Workers AI account Chat Completions endpoint. Cloudflare uses its native ZDR commitment; OpenRouter-only request flags are not sent to Cloudflare. Mixed ZDR/standard provider failover remains rejected.
- STT now calls Cloudflare `@cf/openai/whisper` using server-side `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. The transcript parser accepts the Cloudflare result envelope. Audio and transcript content remain out of logs.
- Cloudflare error 3036 is mapped to `quota_exhausted` and the client cooldown honours the reset time (up to 24 hours) instead of retrying every few minutes.
- Gemini cloud TTS is disabled. Native browser/iOS speech remains the default for PT-BR and EN-GB. The available Aura 2 cloud TTS model is English-only; no Portuguese text is sent to it.
- Added a Cloudflare setup guide and marked the Google Gemini Free guide as historical/not eligible for the EEA deployment.

### Owner action required before runtime activation
1. Confirm the Cloudflare account is on **Workers Free**, not Workers Paid, to prevent any paid overage.
2. Create a scoped API token with Account → Workers AI → Read and add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` as Supabase Edge Function secrets.
3. Add the `JARVIS_MODEL_PROVIDERS` JSON from `docs/cloud/CLOUDFLARE_WORKERS_AI_PROVIDER.md` as a Supabase Edge Function secret.
4. Then run synthetic chat and PT/EN Whisper smoke tests before any personal content is routed.

The available Supabase connector cannot inspect or set Edge Function secrets. Do not request or paste the token in chat. No production function, production secret, billing plan, user account or personal data was changed.


### 2026-11-13 CI correction and deployment boundary
- CI #828 on commit `830c44d261ecd2fbf0cfd92f180140223357c980`: frontend typecheck/build/tests/lint and provider-privacy tests passed; Supabase Edge Function typecheck failed only because TypeScript treats the request audio as `Uint8Array<ArrayBufferLike>`, not a valid `BodyInit`. Corrected in commit `d88dabd43dc3c40ef4b6c972bd1a01f215c6db4a` by copying the bytes into a concrete `ArrayBuffer` before the Cloudflare Whisper fetch. A fresh full CI run is still required on the corrected head.
- Observer Validation #77 passed on `830c44d`. Vercel Preview for `830c44d` is READY; Vercel Preview for `d88dabd` is building. Neither is production.
- Important deployment boundary: the Cloudflare provider changes are committed to the PR #12 source branch and the Vercel frontend Preview only. Supabase `jarvis-preview-api` remains deployed at v19 and production `jarvis-api` remains v32. The new Edge Function code has NOT yet been deployed to either Supabase function. Do not describe the Cloudflare provider as active, and avoid personal voice tests against the old preview backend until the new function is deployed with the owner's Cloudflare secrets.


### 2026-11-13 — EEA provider enforcement and Cloudflare privacy gate
- Added a model-router hard block for `generativelanguage.googleapis.com` in the Ireland/EEA runtime. This prevents an existing `JARVIS_MODEL_PROVIDERS` secret from silently continuing to route user prompts to Gemini Free. No paid Gemini provider is approved. Cloudflare Workers AI is required to declare `privacyMode: "zdr"`; other ZDR endpoints remain host/path allowlisted.
- Updated voice diagnostics from `gemini-cloud` to `cloud-whisper` and corrected the cloud STT failure label.
- Cloudflare's data-use page states that standard stateless inference has zero data retention and Customer Content is not used for training. However, Cloudflare is not an EU-only residency service: its DPA/SCCs provide transfer safeguards for restricted international transfers, not an EEA-only processing guarantee.
- **Per-account provider acceptance is now a release gate.** The app currently has no Cloudflare cross-border provider notice/acceptance flow. The owner and the second account holder must each accept in their own account before personal content is routed. Do not add Cloudflare secrets or deploy the new provider until this gate exists and both accounts have accepted. This is not a claim of legal compliance; it is a product safety gate.
- CI #830 passed on `04dc55e68b6ad578b75e2c82c476b3956fc3c8cf`: frontend typecheck/build/tests/lint, provider privacy tests, semantic-memory validation, Edge Function typecheck, speech transcript tests, isolated Supabase migrations, SQL isolation, authenticated two-user memory API, and production/preview CORS smoke tests. Observer Validation #79 also passed. The Supabase preview function remains v19 and production remains v32; no Edge Function deployment or secret change occurred.


### 2026-11-13 — EU region pinning, safe Preview backend and deployment limits
- Preview Edge Function `jarvis-preview-api` is now v21 ACTIVE, `verify_jwt=false` preserved. Published source was re-read after deployment: it contains the Cloudflare Whisper route and EEA Gemini host deny rule; it does not contain `GOOGLE_AI_STUDIO_API_KEY` or a Gemini endpoint. Cloudflare credentials remain unset; no inference request was sent.
- Preview client code sends `x-region: eu-west-3` on all Edge Function requests; Preview CORS permits the header. This matches the Supabase Postgres project region (Paris). Supabase documentation confirms Edge Functions otherwise execute near the caller and support explicit regional invocation. Runtime confirmation via `x-sb-edge-region` is still pending a request from the updated frontend.
- The frontend provider-status handshake is fail-closed: chat only activates when the backend explicitly identifies Cloudflare Workers AI with ZDR; STT only activates when Cloudflare Whisper is configured. Older backend responses are treated as unapproved. The latest frontend code is in the PR branch but not yet deployed to Vercel.
- Vercel rejected a new Preview deployment because the account exceeded its 100 deployments/day free limit; the API says retry after 24 hours. No upgrade, billing change, or production deployment was attempted. Existing Vercel Preview is older than the provider-status handshake.
- Supabase production `jarvis-api` remains v32 and its deployed source still contains the Gemini route; production was not modified. Avoid production cloud chat/voice until the same EEA/provider protections are reviewed and deployed with explicit approval.
- Cloudflare account plan could not be verified with the connected account's available permissions. No Workers AI token/secrets were created. Cloudflare is not EU-only residency; DPA/SCCs do not guarantee EEA-only inference. A per-account provider notice/acceptance gate is not implemented; both account holders must accept separately before any personal content is routed. Do not add secrets until that gate exists.
- CI #833 passed fully on `fe710ce`. CI #834 passed frontend build/tests/lint, provider privacy tests, Edge Function typecheck and speech tests; the isolated Supabase startup was cancelled after a subsequent branch update. The workflow's preview CORS assertion now checks `x-region` only on Preview (Production remains unchanged). The region-pinning code has passed typecheck/build; a final full run on the corrected workflow and latest branch head remains pending.


### 2026-11-13 — Supabase regional data-residency clarification
- Supabase's current Data Residency and Transfers FAQ confirms that the primary Postgres database, Auth service and Storage origin stay in the selected project region, but account/billing information, support access, usage telemetry/logs and global Storage CDN delivery may involve processing outside that region. Supabase describes international transfers to Singapore and the US under SCCs in its DPA/TIA.
- JARVIS Preview's `x-region: eu-west-3` pin applies to Edge Function execution only; it does not convert the whole Supabase service into an EU-only residency product. The project database/Auth/Storage origin remain in Paris, and Supabase operational/support processing follows its published DPA/TIA.
- The per-account provider notice must accurately disclose both Supabase's regional-processing limits and Cloudflare's potential processing outside the EEA. Do not describe JARVIS as “EU-only” or “all data stays in the EU.” Runtime verification of the Edge Function's `x-sb-edge-region` remains pending a request from the updated frontend.


### 2026-11-13 — Owner authorization for broad free multi-provider integration
- The owner explicitly authorizes autonomous implementation and activation of the JARVIS multi-provider AI pool, including creating/configuring provider accounts and credentials where the owner must perform the account-owner step, provided the service is genuinely free and no paid plan, paid overage, trial-to-paid conversion, or billing commitment is enabled.
- The intended runtime is a pool, not a single primary model: automatically route by task capability and health, track provider/model quotas, and fail over to another eligible provider when a quota, rate limit, outage, or error is reached. Preserve conversation context across provider changes.
- This authorization removes the need to ask the owner again for routine, reversible setup within these boundaries. It does not authorize bypassing provider terms, regional eligibility, identity checks, rate limits, access controls, or technical safeguards; do not falsify location, rotate identities to evade quotas, or disguise prohibited proxy/resale traffic. Use providers from any geography only where their own terms and account eligibility permit the intended use.
- Enforce a hard zero-billing policy: no paid fallback, no paid overage, no paid subscription, no automatic upgrade. If a provider requires payment details or may charge beyond a free allowance, disable that path unless it can be reliably hard-capped at zero cost.
- Owner authorization applies to the owner's account and data only. Preserve strict owner/spouse account isolation; the spouse must separately authorize routing her personal content to any external provider. Never route her data through the owner's authorization.
- Provider selection must account for each provider's current terms, geographic eligibility, privacy/retention, data transfer, model capabilities, quotas and reliability. If a provider cannot legally or contractually serve the request, skip it and continue to the next eligible provider.
- This decision authorizes engineering work and eligible free-provider activation; it does not claim that credentials have been configured, an endpoint is reachable, quotas are available, or production has been deployed. Verify each state independently and record evidence.


### 2026-11-13 — stale Preview URL diagnosis and current canonical candidate

- Owner supplied a screenshot from `jarvis-7g68mgue9-lauro-fiorenzani.vercel.app`. Vercel confirms this is an older Preview from the FreeLLMAPI gateway branch, commit `9265f7c44de2630b48fdda5cee18f614a141e04b`, not the current canonical integration candidate. It must not be used for current auth/device validation.
- Current canonical branch `work/jarvis-canonical-integration` is at `a0e083a77a202e231550153aaca6890d1e65d87f`. Exact-head GitHub CI #839 and Observer Validation #88 both completed successfully. A Vercel Preview for that exact commit is READY at `https://jarvis-42aqzns1e-lauro-fiorenzani.vercel.app` (deployment `dpl_CgNrYG3qZ7Rn8tVfGXciTCAARaRy`).
- The exact-head candidate includes the current CloudAccess/auth bootstrap and accumulated fixes for Preview health routing/CORS, authenticated API route normalization, short audio segment handling and empty transcript rejection. Preview Edge Function remains `jarvis-preview-api` v21; production remains `jarvis-api` v32. No production deployment occurred.
- Supabase Auth logs during the screenshot time window show a password-grant token request returned HTTP 200, followed by a logout HTTP 204; Preview function logs show a health preflight OPTIONS 204. This does not identify a failed password or prove the GET health request completed. Vercel runtime error aggregation returned no errors for the requested window, and no Preview runtime error logs were returned. Treat the screenshot as a stale-Preview/client bootstrap symptom until retested on the exact-head canonical Preview.
- User requests parallel autonomous progress and has broadly authorized project decisions. Continue reversible implementation and validation; preserve spouse account's separate consent for external provider routing. Do not merge or deploy to production, change shared production schema, or expose secrets/data without the appropriate explicit release gate.
- Next physical validation: open only the exact-head canonical Preview above, sign in using the existing account, verify dashboard bootstrap/conversations, then test PT/EN voice. Do not re-enter credentials into the stale gateway Preview. Never request the password or ask the user to paste tokens into chat.

## 2026-11-13 12:50 Dublin — live continuity checkpoint

### Verified repository and release state
- Canonical application repository remains `laurofiorenzani/jarvis`; current integrated candidate is PR #12, branch `work/jarvis-canonical-integration`, HEAD `0cf362fd8e6fbf95303cf38e124631f74596f3ac`.
- Exact-head GitHub Actions CI #876 and JARVIS Observer Validation #89 both completed successfully. Vercel status is successful and the exact-head Preview is READY: https://jarvis-oi80rlfsj-lauro-fiorenzani.vercel.app.
- PR #12 remains OPEN and Ready for Review; it is not merged to main. Production remains separate.
- PR #13 is the FreeLLMAPI/STT quota-guard workstream, OPEN/DRAFT. Its previous latest code commit `93195eba801ea40525476e1f53913e10f2cf327c` had no exact-head Actions run returned and Vercel was blocked by the Hobby build-rate limit. A subsequent documentation-only checkpoint commit `a770b0fb3150e7abf7fa127fdf01184512e52ae8` records the comparison; do not treat the older READY preview as containing the STT test changes.
- Comparing PR #13's recorded base `a0e083a77a202e231550153aaca6890d1e65d87f` to PR #12's current head found one documentation-only commit (10 lines); no code divergence in that comparison. This does not itself authorize merging either PR.
- The latest read of the master record confirms the remaining mobile target is a native iOS deliverable (Capacitor wrapper/native adapters are the documented first route); the native iOS target, Keychain adapter, physical device E2E and TestFlight signing remain outstanding.
- Family CFO is not documented as implemented in the canonical app branch. The only located CFO tracking issue is in the private planning/workbench repository; do not duplicate the database, auth, or memory backend. CFO must be implemented as an account-scoped agent/module over existing Supabase identity and approved data sources, not direct bank access.
- Existing semantic-memory foundation and account separation remain the selected memory architecture. No second memory store is to be introduced.
- Cloudflare Workers Free remains the confirmed tier; no paid plan, billing change, provider activation, audio inference, production deployment or production data mutation was performed in this checkpoint.

### Next execution gates
1. Keep PR #12 as the validated integrated candidate; perform physical iPhone PT-BR/en-GB voice → transcript → authenticated turn → audible TTS validation only against its exact READY Preview.
2. Restore exact-head automated validation for PR #13 without upgrading Vercel or weakening free-tier limits. Deno tests remain unexecuted until a supported runner is available.
3. Reconcile FreeLLMAPI gateway hosting using only already-available free infrastructure; no cloud VM availability or secure production hosting is yet verified.
4. Start native iOS work only on a branch based on the validated integration line, preserving the amber HUD and current auth/memory clients; require macOS/Xcode signing for a genuine device/TestFlight build.
5. Define Family CFO domain interfaces and consented file-import path on the existing backend; do not connect bank accounts or move money. Treat financial figures as user-supplied/imported records with provenance and freshness.
6. Continue BMW, Blink, Dreame, messaging and navigation capability discovery through official APIs and account-level authorization; no unsupported control claims.

### Handoff
- Repo: `laurofiorenzani/jarvis`.
- Validated integrated candidate: PR #12, `work/jarvis-canonical-integration`, HEAD `0cf362fd8e6fbf95303cf38e124631f74596f3ac`.
- Gateway/STT workstream: PR #13, `work/jarvis-freellmapi-cloud-gateway`; its latest recorded documentation checkpoint is `a770b0fb3150e7abf7fa127fdf01184512e52ae8`; exact-head code validation and deploy are still pending.
- No merge, production promotion, account changes, secrets, billing or irreversible cleanup.


## 2026-11-13 13:36 Dublin — iPhone provider-pool and voice diagnostics

### User-provided device evidence
- Three iPhone screenshots captured at 13:35–13:36 Dublin show the JARVIS Cloud Access panel and Voice Diagnostics panel.
- Cloud account status: authenticated; tab-session restore enabled; session clears when the tab closes.
- Provider status displayed by the app: “NO AI PROVIDER CONFIGURED · CLOUD CHAT DISABLED”.
- Both per-account provider-pool controls are shown as not configured and unchecked: strict ZDR pool and free multi-provider routing.
- Memory retrieval and automatic memory suggestions are both checked for this account. Review queue count is zero. This is account preference state only; it does not imply an AI model is configured or that any memory facts exist.
- Voice diagnostics: recogniser running, 2 sessions, 1 transcription failure, 0 accepted, 0 wakes, last heard “nothing yet”, last drop “speech service cooling down for 2s”; error says cloud speech transcription is unavailable and an approved speech provider must be enabled for this account.
- Speaking diagnostics: system engine, no selected voice, 0 handed to OS, 0 actually spoke, 0 failures, 0 cloud rescues.
- These screenshots prove the UI and account session load. They do not prove successful STT, model inference, TTS, or an active provider.

### Source-backed diagnosis
- The current PR #13 branch (work/jarvis-freellmapi-cloud-gateway) contains the per-account provider-preference UI and API, provider-pool selection, FreeLLMAPI standard-privacy routing, Cloudflare Workers AI ZDR routing, and account-isolation integration tests.
- The provider preference migration 20261113110000_jarvis_provider_preferences.sql creates a new RLS-protected table. It has NOT been applied to the live Supabase project. Preview and Production functions remain recorded as jarvis-preview-api v21 and jarvis-api v32 respectively.
- PR #13 code head 637dbe5b02bd636b65bd3fcf3484a9d166b0b853 passed full CI run #861 (43408232534), including two-user provider-preference isolation tests. Later changes are documentation/workflow-ledger updates; run #862 on 47d6ae38b9d78531f8b66bc7c9ad67362a0fc1c7 was cancelled, and no run is currently returned for latest branch head a770b0fb3150e7abf7fa127fdf01184512e52ae8. Vercel reports free-tier build-rate limiting on the later heads.
- Current screenshot's “not configured” state is consistent with the known missing runtime configuration: no FreeLLMAPI private host/unified key is configured; Cloudflare Workers AI secrets are not configured; and the new provider-preferences migration/API has not been deployed to the shared Supabase project. Do not ask the user to toggle controls or retry voice until the matching backend is deployed and a provider is configured.
- The voice loop intentionally keeps the privacy boundary cloud-only; it does not silently fall back to browser/OS speech recognition for command transcription. Cloud Whisper STT is unavailable until Cloudflare credentials are configured server-side and the account has accepted the cross-border processing notice. Native system TTS remains the intended Portuguese/English response path, but the screenshot shows no selected voice and no speech handed to the OS.
- The exact Vercel hostname is not fully legible in the screenshots. Do not assume which immutable Preview deployment the user opened or claim it is the latest branch build.

### Release and approval boundary
- Workers Free was confirmed in the PR #13 research record, with no Workers Paid subscription and no payment method on file. This is not proof that Cloudflare account ID/token secrets exist or that daily Neurons remain.
- PR #13 migration is additive and RLS-protected but changes the shared production Supabase Postgres schema even if only the Preview Edge Function is deployed. It must not be applied without explicit approval of that exact schema change.
- No secrets, provider requests, personal prompts/audio, production functions, schema, user accounts, memory rows, or billing settings were changed during this screenshot diagnosis.
- Immediate safe sequence: validate the exact PR #13 head/workflow; obtain explicit approval for the additive shared-schema migration before applying it; deploy the matching Edge Function to Preview only; verify provider-preference isolation; configure scoped Cloudflare Workers AI credentials through Supabase Dashboard (never in chat); then run synthetic non-personal chat and PT/EN Whisper tests. FreeLLMAPI standard routing remains blocked until a persistent private HTTPS host and server-side key exist.


## 2026-11-13 — post-migration iPhone runtime revalidation

### Verified live Supabase state
- The live project `undmhmdwhxvjgvezvucy` is ACTIVE_HEALTHY in `eu-west-3`. Migration history includes `20261113125425_jarvis_provider_preferences` and `20261113125437_provider_preferences_rls_initplan`; do not reapply either migration.
- Live schema check confirms `public.jarvis_provider_preferences` exists with RLS enabled and zero rows. Privilege checks: `anon` cannot SELECT; `authenticated` can SELECT; `authenticated` cannot INSERT or UPDATE. The only observed policy is authenticated SELECT scoped to `(select auth.uid()) = user_id`. Server-side Edge Function remains the intended writer.
- Live Edge Function inventory: Preview `jarvis-preview-api` ACTIVE v23; Production `jarvis-api` ACTIVE v32. Production was not changed.
- Supabase function-edge logs at 13:35–13:36 Dublin show authenticated Preview GETs returning HTTP 200 for `/v1/health`, `/v1/memory-preferences`, `/v1/conversations`, `/v1/memories`, `/v1/semantic-memory/candidates`, `/v1/provider-preferences`, and `/v1/provider-status`. The earlier provider-preferences HTTP 503 at 12:49 UTC is superseded by successful HTTP 200 responses after migration.
- At the same time, provider-status returned HTTP 200 but the owner screenshot reported `NO AI PROVIDER CONFIGURED · CLOUD CHAT DISABLED`. This means API connectivity and account preference retrieval work; model inference is still unavailable because no approved/configured provider is active. The provider-preferences table remains empty, so no account has enabled a provider pool.
- Function-edge logs show two earlier `/v1/stt` POSTs with HTTP 200 at 07:02 UTC, but no corresponding `/v1/turns` requests were found in the queried log window. Do not treat those STT responses as proof of a usable transcript or completed voice turn. The 13:35–13:36 screenshot has no STT request in its capture window and still shows the cloud speech provider unavailable.

### Vercel and source control
- Latest Vercel Preview deployment on `work/jarvis-canonical-integration` is READY: `https://jarvis-git-work-jarvis-canonical-integration-lauro-fiorenzani.vercel.app`, deployment `dpl_DkVnztGxrTxyZnPv4prnFcYCEcM4`, exact commit `153e69baab4a2b055f30d20ce0d9b163fbaa5592`.
- The branch-scoped Vercel Preview environment for `work/jarvis-freellmapi-cloud-gateway` contains only four public client variables (`VITE_BACKEND`, Supabase URL, public anon key, and function name). This is expected; no server-side provider credentials are present in Vercel. Do not add provider keys to Vercel client variables.
- PR #13 remains OPEN/DRAFT. Full CI run #861 passed on code head `637dbe5b02bd636b65bd3fcf3484a9d166b0b853`, but no GitHub Actions run is returned for the latest PR #13 head `a770b0fb3150e7abf7fa127fdf01184512e52ae8`; exact-head validation remains pending. Vercel currently has a READY deployment for the canonical documentation commit, but that is not proof of the PR #13 branch code being deployed.

### Remaining blockers and next work
- Supabase connector does not expose Edge Function secret-presence metadata. Never retrieve or print secret values. Owner must use Supabase Dashboard to confirm/configure `CLOUDFLARE_ACCOUNT_ID` and a minimally scoped `CLOUDFLARE_API_TOKEN` if absent.
- Cloudflare Workers Free is confirmed from owner-provided billing evidence; no Workers AI inference was sent. Verify current free allocation and model eligibility before a synthetic test; never use paid fallback or enable paid billing.
- Do not ask owner to retest voice until Preview provider configuration is active. First verify provider status reports the configured Whisper and chat provider; then run synthetic non-personal STT in PT/EN and complete one end-to-end turn with native iOS TTS.
- FreeLLMAPI is not deployed. Its Node/SQLite gateway needs a verified persistent private host; current repository instructions describe a bootstrap Quick Tunnel, which is temporary and unsuitable as the durable production hostname. No Oracle/OCI connection is available in this session; do not assume the historical VM exists or is running.
- Native iOS is not yet implemented: the current decision is Capacitor 8 around the existing React/Vite HUD, with Keychain, native audio/lifecycle adapters, macOS/Xcode build and physical-device tests pending. No Xcode/macOS environment is available through current connected tools.
- Self-Evolution foundation is implemented only as a read-only observer/triage prototype on its own branch; production activation and proposal/development automation remain gated. Continue read-only observer coverage and isolated tests.
- Family CFO remains a planned agent, not an implemented live financial integration. Do not invent balances or connect household accounts without explicit authorized data sources.
- No production Edge Function, secrets, provider settings, user accounts, memory facts, or billing settings were changed during this revalidation.


## 2026-11-13 — security advisor and release-gate refresh (13:42 UTC)

### Live security advisor findings
- Supabase Security Advisor currently reports two findings. `public.jarvis_rate_limits` has RLS enabled with no policies (INFO). This is intentionally fail-closed for client roles; rate-limit records are server-managed. Do not add client policies merely to silence the linter. Confirm service-role/Edge Function access remains the only intended write path in a separate reviewed check.
- Supabase Auth leaked-password protection is disabled (WARN). Enabling it changes authentication behavior and requires owner review/approval in Auth settings. Do not toggle it automatically; assess impact on both existing accounts and document the decision.
- No security setting, auth configuration, production data or secrets were changed in this pass.

### PR and validation state
- PR #12 is OPEN, Ready for Review (not Draft), mergeable, head `3f74af2a5c9bc001e86a156d09cc00fcb90f7eae`, base `work/intelligent-memory-foundation`. It remains stacked and has not been merged to `main` or production. The head commit is documentation-only after the last fully green code head `9d0b5f436b5a24ce2fd526180715d17645c7e1ea` (CI #823 and Observer Validation successful). The exact current head has only a Vercel status failure caused by the free-tier deployment rate limit; do not treat that as a code regression, but do not claim a fresh exact-head deployment.
- PR #13 remains OPEN/DRAFT at `a770b0fb3150e7abf7fa127fdf01184512e52ae8`, based on `work/jarvis-canonical-integration`. Its FreeLLMAPI gateway remains a deployment/integration proposal, not a live gateway. No exact-head CI or deployment has validated the latest PR #13 code.
- Latest live Supabase project is ACTIVE_HEALTHY (`eu-west-3`); Preview function v23 and Production function v32. Keep Production v32 unchanged.
- Latest live authenticated Preview reads of health, memory preferences, conversations, memories, semantic-memory candidates, provider preferences and provider status returned HTTP 200. Provider preferences are still empty and Cloud Chat is disabled. HTTP 200 means the API path responds, not that inference is available.

### Execution priorities and guardrails
1. Keep PR #12 as the canonical cloud-auth/memory/voice integration candidate; review its open threads and exact-head code-equivalence before any merge. Do not merge stacked PRs automatically.
2. Keep PR #13 separate until persistent private FreeLLMAPI hosting is actually verified, provider policy acceptance exists per account, and exact-head CI passes.
3. Resolve the leaked-password protection warning through a documented owner decision, not an unattended setting change.
4. Preserve deny-all client access on the rate-limit table; investigate only if a server-side access regression is evidenced.
5. Do not request a new iPhone voice retest while provider status is disabled. Once an eligible provider is securely configured, verify a synthetic PT-BR and English transcript, a real authenticated model turn, and audible device TTS.
6. Continue Self-Evolution on its isolated branch: read-only CI/deployment observation and proposal-only planning first. No production writes, self-approval, or automatic merges.
7. Continue independent work on the iOS delivery specification, Family CFO data contract and official integration capability research without duplicating the existing Supabase memory/auth architecture.



## 2026-11-13 — Cloudflare account inventory refresh

- Cloudflare connection resolves to one account. Read-only `GET /accounts` confirms the account is accessible; account settings currently report `enforce_twofactor: false`. This is an account-wide security setting, not changed in this pass. Owner should review enabling 2FA in Cloudflare dashboard, especially before storing inference credentials or deploying a gateway.
- Read-only `GET /accounts/{account_id}/workers/scripts` returns an empty list. There is currently no deployed Cloudflare Worker script in this account. This independently confirms that no JARVIS Worker/gateway has been deployed there.
- The Cloudflare billable-usage info endpoint returned HTTP 403 Authentication error for the connected token; exact current usage/spend data therefore remains unavailable through this connection. Do not infer zero spend or quota remaining from this failure. The previously owner-provided Workers Free subscription evidence remains the only plan evidence; it does not prove remaining Workers AI Neurons.
- No Worker was created, no AI inference was invoked, no billing setting changed, and no secret was read or written.
- Next: verify Workers AI free allocation and the correct least-privilege token permission through Cloudflare dashboard or a separately authorized read-only billing/usage connection. Keep all inference disabled until the free quota and zero-billing guard are verified.



## 2026-11-13 — iOS release consistency + Family CFO contract

### iOS documentation reconciliation
- Reviewed `docs/architecture/CLOUD_FIRST_ARCHITECTURE.md`, `docs/mobile/IOS_NATIVE_APP_DECISION.md`, `docs/mobile/MOBILE_COMPANION_PLAN.md` and `docs/mobile/IOS_APP_AND_CARPLAY_DELIVERY.md`.
- Found a conflict: the delivery plan described PWA/web as a release-capable fallback, while the canonical architecture requires an installable signed iOS app and permits PWA only as a temporary development/test fallback.
- Updated `IOS_APP_AND_CARPLAY_DELIVERY.md` to match the canonical architecture. The browser client remains a useful companion/test surface; Capacitor 8 native iOS remains a required deliverable. No Capacitor package, Xcode project, signing or iOS build was falsely claimed.
- iOS implementation remains blocked on an available macOS/Xcode environment for native build/signing and physical-device validation. No paid build service is approved.

### Family CFO — first data contract
- Added `docs/agents/FAMILY_CFO_DATA_CONTRACT.md` as a design contract only. It defines source provenance, exact decimal money values, transaction deduplication, transfer handling, balances, income, budgets, mortgage, assets, pensions, investments, document evidence, freshness, and calculation assumptions.
- Defines per-user RLS and bilateral consent before household sharing; read-only/analysis-only first release; no transfers, payments, trades or other money-moving actions.
- Requires official APIs or user-authorized exports, verified zero-cost/privacy eligibility, and synthetic tests before any schema migration or real financial-data import.
- No CFO database tables, connectors, balances, statements, credentials or financial records were created/imported.

### Current validation and deployment evidence
- PR #12 remains OPEN / Ready for Review. Its head now includes the two documentation commits and this ledger update; base remains `work/intelligent-memory-foundation`. It is not merged to `main` and production remains unchanged.
- CI run #881 is running on code-equivalent commit `3427619bd078b2af3cfd5426d11c130ec273ff70`. Typecheck/build, unit tests, lint, provider privacy tests, semantic-memory policy tests, Edge Function typecheck and speech transcript tests have passed; isolated local Supabase startup/migration/isolation and hosted CORS smoke tests were still pending at last observation. Observer Validation #94 on the same head completed successfully (run ID `43436195235`). Do not call CI fully green until run #881 completes.
- Vercel has a READY preview at `jarvis-94ta6vje2-lauro-fiorenzani.vercel.app`, but it is built from earlier commit `153e69baab4a2b055f30d20ce0d9b163fbaa5592`, not the latest documentation commits. Do not present it as an exact-head preview. New deployment creation is currently constrained by the previously observed Hobby build-rate limit; no upgrade or billing change.
- Supabase project `Jarvis` remains ACTIVE_HEALTHY in `eu-west-3`; Production `jarvis-api` v32 and Preview `jarvis-preview-api` v23. Production remains untouched. Public table inventory confirms 13 conversations, 42 messages, 33 turns, 116 rate-limit rows, zero approved memories/facts/summaries/topics/links, and zero provider preference rows; these are live row counts, not a claim that memory is populated.
- Security Advisor still reports: rate-limit table RLS with no client policies (INFO; keep fail-closed) and leaked-password protection disabled (WARN; requires a separate owner decision).

### Next actions
1. Wait for and inspect CI #881 final result; if it fails, isolate the failing job before editing code.
2. Keep PR #12 as canonical candidate; no merge or production deployment before exact-head CI, account-isolation, provider consent and device E2E gates.
3. Keep PR #13 separate and Draft until private FreeLLMAPI hosting, exact-head CI, provider consent and zero-cost safeguards are proven.
4. Continue CFO implementation planning from the new contract with synthetic-only Zod contracts/tests before any migrations.
5. Continue native iOS implementation preparation, but do not claim a native app until a macOS/Xcode build and physical-device validation exist.
6. Continue integration registry design and vendor API feasibility checks without claiming BMW/Blink/Dreame/WhatsApp/CarPlay operations are live.



## 2026-11-13 — Self-Evolution observer CI signal (read-only)

- Continued the isolated `work/self-evolution-engine-foundation` branch; latest commit `762488c23845c81cf1a5195fda3bc2716c0a5b76`.
- Extended `.github/workflows/jarvis-readonly-observer.yml` with read-only GitHub Actions metadata retrieval for the latest repository CI run. Workflow permissions are limited to `contents: read` and `actions: read`; output is restricted to CI status, run number and observation timestamp. No logs, workflow payloads, prompts, user data, or tokens are emitted.
- Verified the new observer workflow completed successfully (run ID `43436701988`) and logged `latest_repository_ci` with status `running` and run number 888 at observation time.
- Added a regression test proving CI/deployment metadata is reduced to allowlisted fields and that repository names, deployment IDs and bearer-like strings are not retained.
- The first validation attempt exposed a pre-existing test expectation bug: the triage test manually supplied an ISO timestamp without milliseconds but expected milliseconds. Corrected the assertion to match the explicit input; no production logic was changed.
- Exact latest-head Observer Validation #100 passed on `762488c23845c81cf1a5195fda3bc2716c0a5b76` (tests, typecheck/build and lint all successful). Full repository CI #889 was still running at last check. This branch is not merged or production-enabled; scheduled observation will not become active until the workflow is merged to the default branch.
- Deployment metadata observation remains pending; no Vercel token or deployment write permission was added. No automated remediation, database persistence, self-approval, merge, or production deployment was introduced.



## 2026-11-13 — Family CFO synthetic domain foundation + CI reliability

### Family CFO implementation
- Added `src/lib/family-cfo.ts`: strict Zod contracts for currency, decimal money strings, source provenance, transaction and balance snapshot records. The module is validation/calculation-only; no bank connectors, persistence, or money-moving actions.
- Added `tests/family-cfo.test.ts`: synthetic fixtures for provenance validation, malformed owner IDs, missing source evidence, balance snapshots, exact BigInt minor-unit arithmetic, and mixed-currency rejection.
- Exact-head CI #892 passed on `fdbebbd58f229bdd7164ad5e99325178dc46ee5a`: typecheck/build, all Node tests (including CFO), lint, provider privacy tests, semantic-memory tests, Edge Function typecheck, speech transcript tests, local Supabase startup, migrations, SQL RLS/isolation tests, authenticated two-user semantic-memory integration, stack cleanup, production API/CORS smoke and canonical preview CORS smoke all succeeded.
- The Family CFO schema remains synthetic-first and is not migrated to Supabase. No real financial data, bank credentials, statements, or balances were imported.

### Self-Evolution validation
- Read-only observer branch `work/self-evolution-engine-foundation` at `762488c23845c81cf1a5195fda3bc2716c0a5b76` passed full CI #889 and Observer Validation #100. Its scheduled observer checks production API/PWA availability and reads latest CI metadata with read-only GitHub Actions permissions. It is not merged/enabled on the default branch.

### FreeLLMAPI proxy hardening and CI maintenance
- Added tests on `work/jarvis-freellmapi-cloud-gateway` for per-minute request budgets, model-query allowlisting, and ensuring prompts/tokens are not written to proxy logs (commit `64d3c5d3e65e6f1215dff7e700751165014862a6`).
- The latest prior PR #13 CI failure was caused by `supabase/setup-cli@v1` resolving `latest` through GitHub Releases and hitting the unauthenticated GitHub API rate limit; application tests/build/typecheck/lint and provider/memory/speech tests had passed before that setup step. Updated the PR #13 workflow to `supabase/setup-cli@v3` with `version: v2.stable` (commit `fe5673b81c95fca24dd13778d48b6d24a4add050`). Applied the same documented version-pinned setup to the canonical branch to reduce nondeterministic release lookup. This preserves Supabase CLI v2 while using the current v3 setup action.
- Current PR #13 remains Draft because private persistent hosting, gateway credentials, exact-head full CI and provider eligibility/consent remain unverified. No host, tunnel, secrets or inference have been provisioned.

### Current release boundary
- PR #12 remains OPEN, Ready for Review, mergeable, head `fdbebbd58f229bdd7164ad5e99325178dc46ee5a` before this documentation/CI maintenance commit, base `work/intelligent-memory-foundation`. It is not merged to `main`.
- Vercel READY deployment `jarvis-94ta6vje2-lauro-fiorenzani.vercel.app` is still built from older commit `153e69baab4a2b055f30d20ce0d9b163fbaa5592`; it is not the current PR head. No deployment of CFO changes or latest branch head is claimed.
- Supabase Production `jarvis-api` v32 and Preview `jarvis-preview-api` v23 remain unchanged. Security Advisor findings remain unchanged: rate-limit RLS with no client policies (INFO; fail-closed) and leaked-password protection disabled (WARN; requires a separate owner decision).
- No production mutation, secret changes, authentication changes, billing changes, paid service activation, or user data transfer occurred.

### Next actions
1. Run exact-head CI after the pinned Supabase CLI workflow update; require all migration, two-user isolation and CORS checks to pass.
2. Keep PR #12 open until explicit release gates are met; no merge/production promotion from broad autonomy alone.
3. Keep PR #13 Draft until a private persistent €0 host is verified and provider credentials/quotas/consents are configured safely.
4. Extend Family CFO deterministic calculations (cash flow, transfer pairing, duplicate import fingerprints) using synthetic fixtures only; schema/RLS migration remains gated.
5. Continue iOS native app preparation; no Xcode build/signing or physical-device validation has been completed in this environment.



## 2026-11-13 — canonical CI green and CFO deterministic analytics

- Exact canonical PR #12 head `0d0e188eec2b0f3b9791cd4beecdd34dc4cc052b`: CI #894 completed successfully; Observer Validation #105 completed successfully.
- Continued CFO work on the canonical integration branch with synthetic-only deterministic helpers:
  - Conservative internal-transfer matching requires posted + confirmed records, same owner/currency, different accounts, exact opposite amount, within three calendar days, and a unique one-to-one candidate. Ambiguous matches are not excluded.
  - Cash-flow calculation includes confirmed posted transactions in an explicit date range, excludes only matched internal transfers, uses integer minor units, and rejects mixed currencies.
  - Stable conservative transaction fingerprint normalizes Unicode, whitespace and case while retaining account/date/currency/amount.
- Added regression tests for transfer pairing, rejection of pending/mismatched transfers, transfer-excluded cash flow, and fingerprint normalization.
- These latest CFO changes are committed to this branch and require fresh exact-head CI; do not call them validated until CI passes.
- No schema migration, bank connection, real financial data, external transfer, production deployment, billing or secrets change.


## 2026-11-13 — CFO fingerprint regression found and corrected

- Canonical CI #896 failed only one of 219 test cases: transaction fingerprint whitespace normalization. Typecheck/build passed; 216 tests passed, one failed, two were skipped. The failure exposed an over-escaped regular expression that matched a literal backslash instead of whitespace.
- Corrected the implementation to use the whitespace matcher `/\\s+/g`, preserving the intended stable fingerprint behavior.
- Observer Validation #107 passed on the same pre-fix head. The corrective commit is `668125a078db63edd7f21b1150476593728187bd`; a new exact-head CI run is required before declaring this fix validated.
- PR #12 was confirmed mergeable again and remains open/Ready for Review. It is 120 commits ahead of its base and zero commits behind; no merge or production promotion was performed.


## 2026-11-13 — exact-head CI diagnosis and CFO reporting-period correction

- Exact-head CI #898 completed with failure after typecheck, production build, unit tests, lint, provider privacy tests, semantic-memory policy tests, Edge Function type-check and speech tests all passed.
- Failure was environmental during isolated Supabase startup: Docker could not bind Inbucket's default host port `54324` because it was already in use. The migrations had begun applying; subsequent isolated SQL, two-user API and cloud CORS steps were skipped. This is not evidence of an application or migration assertion failure.
- Observer Validation #109 passed on commit `8be3eba8bb871a5029f0c58592d47b1af64f2ee2`.
- Fixed CI startup to exclude the unused Inbucket service (`supabase start --exclude inbucket`) in commit `98b02aead64e956d352615419a11355a1016f3db`. A new exact-head run is required; do not mark the integration suite green yet.
- Found and corrected a Family CFO edge case: the cash-flow report previously counted two excluded transfer legs whenever the debit leg was in-period, even if the credit leg was outside the period; it also reported zero when only the credit leg was in-period. The count now measures each matched transfer leg actually within the requested period.
- Added synthetic regression assertions for both cross-period directions. Implementation commit `b0e2d01ad449aae7c9a62bac453322e7b830c83d`; test commit `4a2ec51f1735c9b4f9cf8ab9accc4056e2355259`. These changes still require fresh exact-head CI.
- Current canonical PR #12 head after the CI workflow correction: `98b02aead64e956d352615419a11355a1016f3db`; PR remains OPEN, unmerged and mergeable at last check. The subsequent CFO/test commits precede this workflow commit in branch history.
- Read-only platform check: Supabase project `Jarvis` remains ACTIVE_HEALTHY in `eu-west-3`; Production `jarvis-api` v32 and Preview `jarvis-preview-api` v23 remain unchanged. Migrations list includes provider preferences migrations `20261113125425` and `20261113125437`.
- Vercel currently reports a READY Preview for commit `668125a078db63edd7f21b1150476593728187bd`; this predates the latest CFO edge-case and CI workflow changes. It is not evidence that those newest changes are deployed.
- No production deployment, provider activation, credentials/secrets change, billing change, authentication change, real bank import, or financial transaction occurred.


## 2026-11-13 — CFO regression fixture correction

- CI #901 ran on head `aea617ddf6bd7d009353ff04c875856841786663`. Build/typecheck passed; unit tests failed at the new cross-period CFO assertion. Observer Validation #112 passed.
- The implementation was behaving correctly: the synthetic outside-period transfer leg was dated 19 days after the in-period leg, outside the intentionally conservative three-calendar-day transfer-matching window. The test therefore correctly did not classify it as an internal transfer.
- Corrected both synthetic outside-period dates to 2026-12-01, one day after the 2026-11-30 reporting-period end, so the fixture tests the intended boundary while satisfying the matching rule. Test-only commit `9db9f6b05d04baa9f9b05961762129bd2f7ebbd2`.
- No production data, real transactions, schema, bank integrations or provider settings were involved. Fresh exact-head CI is required.


## 2026-11-13 — CFO cross-period fixture follow-up

- Exact-head CI #903 (PR #12 merge ref dfbab2fd6d991058acd11f32d9ed493b58c4db5e) confirmed the prior fixture correction was incomplete: the in-period debit inherited validTransaction.postedAt = 2026-11-13, while the outside-period credit was 2026-12-01. The 18-day gap correctly exceeded the three-day matching rule, so the assertion expected a transfer match that should not occur.
- Updated the synthetic reporting-period fixtures to use 2026-11-30 for the in-period leg and 2026-12-01 for the outside-period leg in both debit-in-period and credit-in-period cases. This is a test-only correction; production transfer-matching logic remains unchanged.
- Follow-up commits: bb5c52a267de0e424dc0774e571578a66dc5e7f4 (fixture alignment) and 92abf1e7649655fb5fdcde7a2ce704c16a30af86 (simplify fixture expression). Fresh exact-head CI is pending; do not mark validated yet.
- CI #903 typecheck/build passed, 216 tests passed, one CFO test failed, two skipped; lint and later Deno/Supabase integration steps were skipped because the test job stopped. Observer Validation #114 passed on the previous documentation head 88065acc. 
- Read-only platform recheck: Supabase remains ACTIVE_HEALTHY in eu-west-3, production jarvis-api v32 and preview jarvis-preview-api v23; Cloudflare connector identity is available; latest five Vercel deployments remain READY but latest canonical preview is still older commit 668125a. No new deployment was created due the recorded Hobby build-rate limit.
- No production changes, credentials/secrets, provider activation, billing, user data or bank data were modified.


## 2026-11-13 — CFO cross-period correction validated

- Exact canonical integration branch commit `d089d862ff54975912d16f62bbd62caaaef0b1c1` triggered CI #906 (run ID `43446745391`) and JARVIS Observer Validation #117 (run ID `43446745420`). Both completed successfully.
- CI #906 passed all listed stages: dependency install/audit, typecheck + production build, Node test suite, lint, provider privacy routing, semantic-memory policy tests, Supabase Edge Function typecheck, speech transcript tests, isolated Supabase startup, migration application, SQL isolation regression tests, authenticated semantic-memory API tests with two isolated users, stack cleanup, production API/CORS smoke test and canonical preview CORS smoke test.
- Observer Validation #117 passed observer privacy/triage tests, typecheck/build and lint.
- This validates the synthetic Family CFO cross-period fixture correction committed in `bb5c52a267de0e424dc0774e571578a66dc5e7f4` and `92abf1e7649655fb5fdcde7a2ce704c16a30af86` as part of the tested canonical PR merge ref. It does not validate bank integrations, real financial data, schema migration for CFO, provider inference, iOS device E2E or production release.
- Vercel combined commit status still reports the Hobby build-rate-limit failure. Do not upgrade or create repeated deployments; no exact-head new preview is claimed.
- No merge, production deployment, secret/provider activation, billing change, real financial import or account mutation occurred.
- Next: keep PR #12 unmerged pending remaining release gates; verify latest PR head/base/mergeability and inspect whether the Vercel failure is only the external preview check. Continue read-only infrastructure/hosting investigation and isolated Self-Evolution work.


## 2026-11-13 — Observer #118 and canonical PR recheck

- Observer Validation #118 completed successfully on canonical head `702899933abd34def2ce472ae92a3fee813b2156` (run ID `43448634050`): observer privacy/triage tests, typecheck/build and lint passed.
- CI #907 (run ID `43448634289`) on the same head: dependency audit/fix, typecheck/build, Node tests, lint, provider privacy, semantic-memory policy, Edge Function typecheck and speech transcript tests all passed. Isolated local Supabase startup was still running at the latest observation; migrations, SQL isolation, authenticated two-user integration and cloud CORS smoke tests remain pending. Do not mark full CI green yet.
- Vercel combined status for canonical head `7028999...` is now SUCCESS (previously Hobby build-rate-limit failure). This is a successful status check; deployment URL/readiness and exact artifact were not independently inspected in this pass.
- PR #12 rechecked: OPEN, Ready for Review, not merged, mergeable=true; base `work/intelligent-memory-foundation`, head `work/jarvis-canonical-integration` at `702899933abd34def2ce472ae92a3fee813b2156`.
- PR #13 rechecked: OPEN, Draft, not merged, mergeable=false. Comparing its branch with the canonical branch shows 67 commits ahead and 30 behind (diverged), with changes spanning gateway proxy, model router, CloudAccess, Supabase function/CORS, tests, workflow and ledger. No automatic merge/rebase was attempted. The provider-gateway design and proxy were reviewed: public routes limited to models/chat, separate bearer auth, upstream key replacement, bounded request size, rate limiting and no prompt logging are present in source; deployment and host remain unverified.
- Live migration inventory confirms provider-preferences migrations are recorded. No provider preferences were enabled, no inference called, no secrets changed, no production deployment, no account/data mutation and no billing change.
- Next: finish CI #907's isolated Supabase and CORS stages; reconcile PR #13 feature-by-feature on a dedicated integration branch only after inspecting each conflict, retaining PR #12 as canonical; continue private free-host investigation without assuming Oracle VM exists.


## 2026-11-13 — Family CFO calendar-date validation branch

- Created isolated branch `work/family-cfo-date-validation` from canonical head `911139752056b452152ebda755f0337659e12d78`.
- Hardened `IsoDateSchema` in `src/lib/family-cfo.ts`: dates must now be valid calendar dates, not merely match the YYYY-MM-DD shape. Added synthetic regression coverage for valid leap day, invalid non-leap day, impossible month-day and invalid provenance effective date.
- Commits: `a038284926564c0ea7b5ecd3b4241048881d4aa8` (schema) and `99bca2e93c3658e19a051668cc12475122164b9f` (tests). A PR validation run has not yet been observed; implementation is committed but not yet tested by CI. No real finance data, DB schema, bank connection or financial action involved.
- Canonical CI #907 was cancelled during isolated Supabase startup after its fast stages passed; migrations, SQL isolation, authenticated two-user API and CORS steps were skipped. A rerun attempt led to CI #908, which was also cancelled during isolated Supabase startup. Observer #119 passed on canonical head `911139752056b452152ebda755f0337659e12d78`. This is not a full green CI result.
- Vercel remains blocked by the Hobby build-rate-limit status for canonical head; no paid upgrade.
- PR #12 remains OPEN/Ready for Review/unmerged. PR #13 remains OPEN/Draft/unmerged and diverged from canonical (67 ahead / 31 behind at latest comparison). Its provider-consent UI currently describes differing retention/training/regional terms generically; the more explicit EEA data-processing disclosure requirement remains a blocker before either account enables external-provider routing.


## 2026-11-13 — Family CFO date validation merged; provider deployment cross-check

### Family CFO
- PR #14 (`work/family-cfo-date-validation`) was merged by squash into the canonical integration branch only. Merge commit: `7dac36fbcaf1e0fbb13f017a8e397ac538fe4b10`.
- Exact PR validation CI #909 (run ID `43449606038`) completed SUCCESS. All 23 substantive stages passed: dependency install/audit, typecheck/build, Node tests, lint, provider privacy, semantic-memory tests, Edge Function typecheck, speech tests, isolated Supabase startup, migrations, SQL isolation, authenticated two-user API integration, teardown, production CORS and canonical Preview CORS.
- Change: `IsoDateSchema` now rejects impossible calendar dates, not just malformed YYYY-MM-DD strings. Synthetic tests cover valid leap day, invalid non-leap day, impossible month/day and invalid provenance effective date.
- This merge targets `work/jarvis-canonical-integration`, not `main`; no production deployment or real financial data/schema change.

### Cloud / provider runtime cross-check
- Supabase project `Jarvis` remains healthy; migration inventory confirms provider-preferences migrations `20261113125425` and `20261113125437` are applied.
- Live Edge Function inventory: Production `jarvis-api` ACTIVE v32; Preview `jarvis-preview-api` ACTIVE v23.
- Read-only deployed-source inspection confirms Preview v23 contains the per-account `/provider-preferences` route, separate standard/ZDR pool handling and FreeLLMAPI gateway/task-classification code. It does not contain the newer `isCloudflareDailyQuotaExhausted` helper. Production v32 contains none of the provider-preferences or FreeLLMAPI additions. No function deployment was performed in this session.
- Cloudflare API inventory confirms the connected account currently has **zero Worker scripts deployed**. The earlier plan/absence-of-payment-method observation remains historical; current API inventory does not grant a new inference host or verify Neurons quota. No Worker, tunnel, secrets or inference were created.

### PR #13 privacy disclosure work
- Added an explicit provider consent notice in `src/ui/CloudAccess.tsx` distinguishing Supabase Paris primary-region storage from categories that may be processed outside that region, Cloudflare Workers AI's documented stateless ZDR/no-training commitments and exceptions, and FreeLLMAPI downstream provider-specific retention/training/region terms.
- Added official references and the same processing-boundary explanation to `docs/cloud/FREELLMAPI_CLOUD_INTEGRATION.md`.
- Source checks: Supabase Data Residency and Transfers FAQ (2026-10-06) and Cloudflare Workers AI data-usage docs (2026-10-16). The disclosure commits no account to provider use; both pools remain opt-in and must be enabled separately per account.
- PR #13 remains OPEN/Draft/unmerged. Its branch is 69 commits ahead and 32 behind canonical (diverged). No merge/rebase attempted; exact-head CI for its latest disclosure commits has not appeared in the connected workflow lookup. Vercel Hobby build-rate-limit remains a failure status; no paid upgrade.

### Current gates
- PR #12 remains OPEN/Ready for Review/unmerged; production `jarvis-api` v32 remains unchanged.
- PR #13 requires branch reconciliation, full exact-head CI, private persistent €0 gateway host verification, provider eligibility/consent and authenticated two-account E2E before merge or activation.
- Native iOS, physical device PT/EN voice E2E, BMW/home/messaging integrations and real Family CFO bank imports remain unimplemented/unvalidated.


## 2026-11-13 — Self-Evolution observer incremental port

- Created isolated branch `work/self-evolution-readonly-observer` from canonical commit `2e7134e45042adf9cd9a6cc8a00c0909ef6ec462` and opened PR #15: https://github.com/laurofiorenzani/jarvis/pull/15 (OPEN/Draft, unmerged).
- Ported incremental changes from the previously validated observer foundation: canonical ISO timestamp formatting in triage evidence, regression tests for CI/deployment metadata redaction, and a read-only scheduled observer workflow that checks only public API/PWA HTTP health plus latest repository CI status. Workflow permissions remain `contents: read` and `actions: read`; no raw logs, prompts, private conversation content, credentials, production writes or automated remediation.
- Preserved existing `main` workflow triggers and added the isolated branch trigger. Scheduled execution remains inactive until the workflow reaches the default branch.
- Exact-head CI/Observer run has not been confirmed for PR #15; combined status shows Vercel Hobby build-rate-limit failure only. Keep PR Draft until its validation workflow is confirmed. No merge or deployment.
- The earlier observer branch was 135 commits behind canonical and was not merged/rebased; only the five-file incremental patch was ported to a clean branch from the current canonical head. The temporary tree-construction attempt was rolled back to the exact base commit before a corrected base-tree commit was created; final compare confirms only five intended files differ and no repository files are deleted.
- Observer Validation #120 passed on Family CFO merge commit `7dac36fbcaf1e0fbb13f017a8e397ac538fe4b10`. CI #910 for the subsequent canonical docs head was cancelled by later branch updates; it is not a full CI result. PR #14 remains closed/merged into canonical development branch only.


## 2026-11-13 — Self-Evolution PR #15 branch alignment and FreeLLMAPI recheck

- Corrected PR #15's validation workflow push trigger to include `main` and `work/self-evolution-readonly-observer`; pull_request path filters remain active. Read-only observer workflow checks public production API/PWA HTTP availability and the latest CI run metadata. Permissions are `contents: read` and `actions: read` only.
- Rebased the isolated PR #15 branch by rebuilding its five intended file changes on top of latest canonical commit `e6c40a7585d466c2e765056f3d7370dc691c18cf`. Current PR head `d25d7d341c2a52f01b3cabbb21f4afaa68530115`; compare confirms exactly 1 commit ahead, 0 behind, only five intended files changed, no deletions. PR #15 remains OPEN/Draft; GitHub currently reports `mergeable:false`; no exact-head CI/Observer run is visible through the connected workflow lookup, and Vercel status remains Hobby build-rate-limit failure. Keep Draft; do not merge.
- PR #13 recheck: still OPEN/Draft/unmerged and diverged 69 commits ahead / 34 behind canonical. Its provider routing implementation remains substantial and must be reconciled selectively, not merged/rebased as a whole. The current migration source is named `20261113110000_jarvis_provider_preferences.sql`, while the live Supabase migration inventory records `20261113125425_jarvis_provider_preferences`; verify schema equivalence and migration-history handling before any branch integration. The separately recorded `20261113125437_provider_preferences_rls_initplan` migration is present on PR #13. Both provider pools remain default-off; no secrets, provider inference or account preference rows changed.
- PR #12 remains OPEN/Ready for Review/unmerged and mergeable at latest check. Production `jarvis-api` remains v32; Preview `jarvis-preview-api` v23. No production changes, deployments, secrets, billing or account data mutations.


## 2026-11-13 — Provider-preferences migration provenance repaired

- Read-only Supabase inspection confirms `public.jarvis_provider_preferences` exists with RLS enabled, `user_id` primary key/FK to `auth.users`, `zdr_pool_enabled` and `standard_pool_enabled` default false, `policy_version`, `accepted_at`, `updated_at`, and the consent CHECK constraint requiring policy version/timestamp whenever either pool is enabled.
- Live constraint inspection confirms the consent CHECK and user FK. Live `pg_policies` confirms one SELECT-only policy for `authenticated` using `(select auth.uid()) = user_id`. Grants show `authenticated` has SELECT only; `service_role` and postgres retain server/admin privileges. Table row count remains zero.
- Supabase migration history records `20261113125425_jarvis_provider_preferences` and `20261113125437_provider_preferences_rls_initplan`, but the canonical Git branch did not contain the matching first migration source file. Added `supabase/migrations/20261113125425_jarvis_provider_preferences.sql` to the canonical integration branch, matching the live table/consent/RLS baseline; the following `20261113125437` migration applies the initplan-optimized policy. This is source-control provenance repair only; no migration was applied to the live database in this step.
- PR #13's older migration uses the same logical schema but filename/version `20261113110000`, which is not present in live migration history. Keep PR #13 unmerged; reconcile/remove the duplicate historical migration during selective port so a future db push does not attempt an out-of-order or duplicate migration.
- No provider preference rows were inserted, no provider pools enabled, no secrets or Edge Functions changed, no production deployment, billing or account mutation.


## 2026-11-13 — latest branch heads and validation gate

- Canonical integration branch now includes the migration provenance source file and ledger commit `59148fa77fea523ae06f32b15d71c41facf7a2bb`.
- PR #15 branch was re-aligned again on that exact canonical head. Current head `c9c242a007c3a3827241cfee3a8b55377acfb782`; compare confirms 1 commit ahead / 0 behind and exactly five intended files. PR remains OPEN/Draft; connected workflow lookup still shows no exact-head CI/Observer run and combined status reports only Vercel Hobby build-rate-limit failure. GitHub metadata still reports `mergeable:false`, so do not promote to Ready or merge until CI is visible and mergeability is rechecked.
- Live Supabase schema audit for provider preferences is now recorded: RLS enabled; consent CHECK constraint present; only authenticated SELECT policy scoped to `(select auth.uid()) = user_id`; authenticated has SELECT only; service_role retains server-side DML. Zero preference rows; no pools enabled.
- Current PR #13 divergence is 69 ahead / 34 behind. Its older migration version `20261113110000` must be reconciled against live-applied `20261113125425` before any selective integration. No PR #13 code, provider secret, provider pool, or production function was changed.
- No production deploy, auth/account mutation, billing change, real finance import or provider inference occurred.


## 2026-11-13 — PR #15 Self-Evolution observer merged to canonical development

- Exact PR #15 head `2249853a157f5e6b1782ce202c6c70998604d864` passed GitHub Actions CI #921 (`43452600850`): all substantive stages successful, including typecheck/build/tests/lint, provider privacy and semantic-memory tests, Edge Function typecheck, speech tests, isolated Supabase migration and SQL isolation, authenticated two-user semantic-memory API integration, production CORS and canonical Preview CORS.
- Observer Validation #135 (`43452601059`) passed exact same head: observer privacy/triage tests, typecheck/build and lint.
- PR #15 was marked Ready for Review and squash-merged into `work/jarvis-canonical-integration`. Merge commit: `b18af5a36938a5ae3521d277075957527f16c9c6`. This is canonical development only; no main/production merge or deployment. The observer remains read-only with `contents: read` and `actions: read`.
- The PR's five intended files were the only changed paths. PR #15 is closed/merged; re-run canonical branch CI/Observer after this merge before any further promotion. Vercel Preview for the PR branch existed but recorded a SHA older than the exact final head; exact validation is GitHub CI/Observer, not a claim of exact-head Vercel build.
- Live Supabase remains ACTIVE_HEALTHY in Paris, Production `jarvis-api` v32 and Preview `jarvis-preview-api` v23. No function deployment, provider activation, secrets, user/account data, auth or billing changes.


## 2026-11-13 — STT free-quota guard isolated port and live cost check

- Read-only Cloudflare API confirmed `GET /accounts/{account_id}/workers/scripts` returns an empty list: zero deployed Workers scripts. AI Gateway credit balance is `0`; no default payment method; automatic top-up threshold and amount are both `0`. No billing setting was changed. This verifies the account is not configured to auto-top-up through AI Gateway; it does not prove all possible Cloudflare services have zero usage/cost.
- Created isolated branch `work/stt-cloudflare-quota-classification` and PR #16 (`dfc3e62eecd2ffaafdea59d8b0c40874d4cc4c13`) to selectively port the tested Cloudflare daily-allocation error-code helper from PR #13 into canonical STT code. Only three files differ: `index.ts`, `speech-transcript.ts`, `speech-transcript_test.ts`. This preserves 429 + reset-aware Retry-After and adds Deno regression tests; no provider request or deployment performed.
- PR #16 exact-head CI #924 (`43455106810`) currently in progress. Typecheck/build, tests, lint, provider privacy, semantic-memory policy, Edge Function typecheck and speech tests passed; isolated local Supabase startup was in progress at last inspection. PR remains Draft pending full exact-head CI and Observer Validation.
- Canonical PR #12 head `d674c13132af421d46beeb35a260c44f3e16be9d` has post-PR15 merge CI #923 (`43454699438`) in progress; typecheck/build/tests/lint/provider privacy/semantic memory/Deno tests/SQL migrations/SQL isolation passed, authenticated two-user semantic-memory API integration was in progress. Observer Validation #137 succeeded.
- Vercel created a READY Preview for PR #15 merge commit `b18af5a36938a5ae3521d277075957527f16c9c6`: `https://jarvis-q54md4qxb-lauro-fiorenzani.vercel.app`. It is a preview, not production; no alias promotion.
- PR #13 remains OPEN/Draft/unmerged, 69 commits ahead / 34 behind canonical. Its full feature branch remains unsuitable for blind integration. No provider secrets, pools, account rows, Edge Function deployments or production changes.


## 2026-11-13 — incremental cross-platform, database and deployment reconciliation

### STT quota guard
- PR #16 was based on the previous canonical SHA and had a one-commit documentation-only gap. Its three-file change was reviewed and selectively re-applied on a clean branch based on canonical head `c82bc100fbea773eab5bdc654ec7078da6685408`.
- PR #17: `work/stt-cloudflare-quota-canonical`, head `250f750c60ae3f891301e9e6805154cf01d17b76`; exact diff is only `index.ts`, `speech-transcript.ts`, and `speech-transcript_test.ts`. PR #17 exact-head CI #926 completed SUCCESS, including isolated Supabase migrations, SQL isolation, authenticated two-user API integration and production/Preview CORS. Vercel Preview was SUCCESS. PR #17 was squash-merged into canonical development as `2e5474b4324d6057032985fb663f1c9906560629`; no main/Production merge or deployment occurred. Observer Validation was not triggered because observer files/workflow paths were unchanged; Observer Validation #139 passed on the canonical development merge commit; observer source was unchanged in PR #17.
- Original PR #16 was closed as superseded after its only three-file change passed exact-head CI #926 in PR #17 and was merged into canonical development.

### Provider-preferences migration provenance
- Live Supabase migration history contains `20261113125425_jarvis_provider_preferences` and `20261113125437_provider_preferences_rls_initplan`.
- Canonical Git tree contains the matching `20261113125425_jarvis_provider_preferences.sql` source but was missing the already-applied `20261113125437_provider_preferences_rls_initplan.sql` source.
- PR #13 contains the correct `20261113125437` policy-refinement source. Its older `20261113110000_jarvis_provider_preferences.sql` is logically the initial provider-preferences migration but is NOT present in live migration history and must not be ported or reapplied; it would duplicate the already-applied schema.
- The only safe provenance repair is to add the exact `20261113125437` source file to canonical source control. No migration is being applied to the live database by this repair.

### Supabase live read-only verification
- Project `Jarvis` is ACTIVE_HEALTHY in `eu-west-3`; PostgreSQL 17.11. Production `jarvis-api` is ACTIVE v32; Preview `jarvis-preview-api` is ACTIVE v23.
- `public.jarvis_provider_preferences` exists with RLS enabled, a user_id primary key/FK, default-off ZDR/standard booleans, and consent CHECK constraint; current row count is zero. No provider pools were enabled and no account, auth, session, conversation, or memory data was changed.
- All inspected JARVIS public tables have RLS enabled. `jarvis_rate_limits` has no direct RLS policy, which is intentional in the current access model: table grants are limited to postgres and service_role; the SECURITY DEFINER rate-limit RPC has EXECUTE only for service_role (not anon/authenticated); anon/authenticated cannot CREATE in public. The Supabase INFO advisor finding is therefore not a reason to add a public policy.
- The Supabase security advisor still reports leaked-password protection disabled (WARN). This auth-wide setting was not changed. Eighteen unused-index INFO findings were observed on a low-traffic dataset; no index was removed.
- The live provider-preferences schema and grants were inspected read-only. No schema change, migration, data write, or deployment occurred.

### Production versus Preview provider policy — release blocker
- Deployed Production `jarvis-api` v32 source still references `GOOGLE_AI_STUDIO_API_KEY` and direct `generativelanguage.googleapis.com` STT/TTS calls.
- Deployed Preview `jarvis-preview-api` v23 contains Cloudflare Workers AI Whisper STT and Cloudflare provider routing; its model-router includes a Gemini host restriction. Production and Preview are not provider-behaviour equivalent.
- Supabase connector cannot securely verify Edge Function secret presence or values. Source references do not prove that the Google secret exists or that any request/audio is being sent. No secret was read and no inference request was sent.
- A read-only follow-up comment was added to PR #12 with this finding. Do not promote to Production until provider code, current Ireland/EEA policy, per-account consent, zero-cost limits, exact-head CI, two-account isolation and physical iPhone PT/EN E2E are reconciled and reviewed.

### Cloudflare cost/runtime inventory
- Current Cloudflare API inventory: zero Worker scripts and zero AI Gateway gateways.
- Current Billing Read calls are denied by the connected Cloudflare credential; current credits, spend policies, payment method and current Workers plan cannot be re-verified through this connection. Historical ledger entries about zero AI Gateway balance/no payment method remain historical only, not a fresh billing attestation.
- No Worker, gateway, tunnel, secret, provider inference, paid plan, or billing setting was created or changed.

### Native iOS and FreeLLMAPI runtime
- Recursive tree inspection of the canonical application branch found no `ios/`, `.xcodeproj`, `.xcworkspace`, Swift source, or Capacitor scaffold. The package remains React/Vite; native iOS, Keychain plugin, signing and TestFlight are not implemented.
- PR #13 currently remains OPEN/Draft and diverged (69 commits ahead / 43 behind canonical at last compare). Its private Node 22 proxy package and tests are source code only. The host, FreeLLMAPI service, gateway token, unified key, provider credentials and private tunnel are not deployed/configured; no inference has been sent. Oracle VM state remains unverified and no Oracle connector is available.
- No bulk rebase/merge of PR #13 is safe. Continue feature-by-feature, excluding its duplicate migration version.

### Safety and release controls
- No Production Edge Function, Vercel alias, account, auth setting, secret, provider preference, memory, billing plan, or user data was changed.
- Keep provider pools disabled until each account holder independently accepts the complete provider/data-transfer notice. Do not infer that Supabase Paris region or Cloudflare ZDR means all processing remains in the EEA.
- Keep all changes on isolated PR branches; no production promotion or paid upgrade.


## 2026-11-13 — provider migration provenance merged; FreeLLMAPI proxy hardening in validation

### Provider-preferences migration source
- PR #18 was merged into `work/jarvis-canonical-integration` as `428d42b52e2c917969ced3a11ba2eca7987cc4c0` after exact-head CI #929 completed SUCCESS, including local Supabase migration reset, SQL isolation, authenticated two-user API tests and CORS smoke tests.
- The merge adds only the source file for the already-applied `20261113125437_provider_preferences_rls_initplan` migration and updates the master ledger. No migration was executed against the live Supabase project and no production deployment occurred.

### FreeLLMAPI private proxy — PR #19
- PR #19 selectively ports the Node 22 private proxy onto the canonical lineage. It requires `FREELLMAPI_ALLOWED_MODELS` and accepts only explicit named `auto:<profile>` model routes; generic `auto`, `fusion`, missing/malformed models and unlisted profiles are rejected before upstream FreeLLMAPI is contacted.
- The deployment package includes Dockerfile, Compose overlay, environment template, setup documentation and synthetic tests. The sample route is `auto:jarvis-approved`; its FreeLLMAPI fallback profile must contain only individually verified eligible/free providers. The proxy allowlist is not proof of downstream provider eligibility.
- CI #931 found one test assertion mismatch: the proxy correctly records `POST /v1/chat/completions`, while the test expected only the path. The assertion was corrected; no runtime code change was needed. The branch is rebased onto the latest canonical head and exact-head CI must pass before merge.
- Vercel Preview remains rate-limited by the Hobby 100-deployments/day limit. No paid upgrade; GitHub CI is the source validation for this backend-only package.

### Provider-consent and FreeLLMAPI acceptance gaps
- PR #13's current consent copy documents Supabase's Paris primary region and Cloudflare Workers AI ZDR/no-training commitments, but does not explicitly state that Workers AI is global inference infrastructure and that no EU/EEA-only inference-processing guarantee has been verified. A review comment was added requesting this explicit disclosure.
- Cloudflare's official Workers AI data-usage documentation describes stateless content handling, no-training and operational metadata exceptions, but does not establish EU-only inference processing: https://developers.cloudflare.com/workers-ai/platform/data-usage/ . The platform describes Workers AI as global inference infrastructure: https://developers.cloudflare.com/workers-ai/platform/ .
- FreeLLMAPI's Edge Function adapter can validate the gateway hostname but cannot see the downstream provider selected by named fallback profiles. A review comment requires an audited named profile containing only individually vetted free providers, with country eligibility, personal-use terms, quota/reset, privacy/retention/training, region, no-payment-method and no-paid-fallback evidence. Keep both account pools disabled.
- Current CloudAccess consent UI on the canonical branch still does not contain provider-pool controls; the feature exists only on the divergent PR #13 branch pending selective integration.

### Canonical provider-preferences code status — correction to prior chat handoff
- Exact read-back of current `work/jarvis-canonical-integration` after PR #18 confirms that `ProviderPreferencesResponse` is NOT present in `src/lib/backend-contract.ts`; `getProviderPreferences`/`setProviderPreferences` are NOT present in `src/lib/cloud-api.ts`; provider-pool controls are NOT present in `src/ui/CloudAccess.tsx`; `/provider-preferences` routes and the standard pool are NOT present in canonical `index.ts`/`model-router.ts`.
- Therefore the earlier chat handoff statement that the TypeScript contract was already in canonical is stale/incorrect against the current repository head. The live table and applied migrations exist, but the application-level provider preferences integration remains a selective-port task from PR #13. Do not claim it is integrated until a clean PR adds the type, client methods, UI, backend routes, standard/ZDR routing, tests and two-user isolation checks.

### Current canonical and release state
- Canonical development head includes PR #17's STT daily-quota classifier and PR #18's migration source provenance. PR #17 CI #926 and canonical CI #928 passed; Observer Validation #139 passed on the PR #17 merge commit.
- Production `jarvis-api` v32 remains unchanged; Preview `jarvis-preview-api` v23 remains unchanged. No provider secrets were read, no inference was sent, no provider pool enabled, no account/auth/session/memory data changed, and no production deployment or billing change occurred.
- Native iOS/Swift/Xcode/Capacitor project remains absent from the canonical tree. PWA is not the native iOS deliverable.


### PR #19 canonical rebase and merge — 2026-11-13
- Rebased the complete proxy package onto canonical merge commit `428d42b52e2c917969ced3a11ba2eca7987cc4c0`. The exact PR head `8f316258c6ff9973fc3b3d321ad8788bc38a11a1` passed CI run #934, including typecheck/build, full tests, lint, provider privacy routing, semantic-memory policy, Deno Edge Function tests, isolated Supabase migrations, SQL isolation, authenticated two-user integration, and production/Preview CORS smoke tests.
- PR #19 was marked ready and squash-merged into `work/jarvis-canonical-integration` as `36d4fa7d1491e44c5f97a0bab9800858def45815`. This is a development-branch merge only; no production deployment, provider credentials, inference, host, tunnel, billing or live data changes occurred.
- The proxy now requires `FREELLMAPI_ALLOWED_MODELS`, allows only explicitly named `auto:<profile>` routes, and rejects generic `auto`, `fusion`, malformed/missing and unlisted profiles before upstream FreeLLMAPI calls. The sample `auto:jarvis-approved` label is not provider certification; its actual downstream fallback chain must still be audited and pinned to eligible free providers before activation.
- Upstream FreeLLMAPI deployment guidance: pin an immutable reviewed release/commit; retain loopback-only `HOST_BIND`; never expose port 3001; leave Watchtower/autoupdate disabled because it mounts the Docker socket. Record the upstream SHA before any host deployment.

### Cloud-first and native iOS handoff revalidation — 2026-11-13
- Re-read `docs/architecture/CLOUD_FIRST_ARCHITECTURE.md`, `docs/mobile/IOS_APP_AND_CARPLAY_DELIVERY.md`, and `docs/mobile/IOS_NATIVE_APP_DECISION.md`. The approved mobile target is Capacitor 8 around React/Vite, not a fully SwiftUI rewrite and not a PWA. Capacitor requires Node 22+ and macOS/Xcode 26+ for iOS generation/build/signing; the current connector environment does not provide Xcode/macOS.
- iOS work remains parallelisable: package/config/app identity, mobile UI adaptation, Keychain adapter/plugin selection, native voice/lifecycle adapters and build workflow. Native build/signing/physical-device/TestFlight validation remains blocked on Apple-compatible macOS/Xcode and signing credentials; do not provision paid macOS build services.
- CarPlay is a separate restricted template-based companion and requires Apple's approved entitlement. Do not promise a general-purpose JARVIS HUD on CarPlay or treat CarPlay as the BMW integration mechanism.

### Self-Evolution and Family CFO source-of-truth recheck — 2026-11-13
- `docs/architecture/self-evolution-engine.md` remains a foundation/read-only observer design; not production-enabled. Human approval remains required for merges, production, auth/security, secrets, billing and consequential integrations.
- `docs/agents/FAMILY_CFO_DATA_CONTRACT.md` requires dated sourced balances, strict account/member consent, source coverage, explicit missing data, and no invented transactions/saldos. The current finance project remains a data-contract/design foundation; no live bank/pension/mortgage connector data was accessed or imported in this pass.

### Canonical state after PR #19
- Canonical development head: `36d4fa7d1491e44c5f97a0bab9800858def45815`. PR #17, #18 and #19 are merged into the canonical development branch; PR #16 is closed as superseded. PR #13 remains open/Draft and diverged (69 commits ahead / 43 behind at last compare); do not bulk merge/rebase it.
- Production Supabase `jarvis-api` remains ACTIVE v32 and Preview `jarvis-preview-api` remains ACTIVE v23. Production and Preview provider behaviour remains divergent; this is a release blocker. No production function deployment was made.
- Cloudflare account inventory previously returned zero Workers and zero AI Gateways; Billing Read remains denied, so current spend/payment/credit status cannot be freshly attested. No Cloudflare resource or paid plan was created.
- Native iOS project remains absent from canonical repository; Capacitor packaging/build, Keychain plugin wiring, physical-device test, CarPlay entitlement, and TestFlight are not complete.
- Provider-preferences application contract/client/UI/routes remain absent from canonical branch even though the Supabase table and migration exist. PR #13's cohesive feature set still requires selective integration; exclude its duplicate `20261113110000` migration and do not enable either provider pool.



## 2026-11-13 16:22 UTC — current cross-front handoff

### Canonical GitHub development state
- Canonical branch at start of this handoff: `work/jarvis-canonical-integration`, base `a88a1bc3967d6026ba53e2385289cacffd37da07`.
- PR #17 (STT daily quota classifier) merged as `2e5474b4324d6057032985fb663f1c9906560629`; exact-head CI #926 and canonical CI #928 passed; Observer Validation #139 passed.
- PR #18 (restore source provenance for the already-applied provider-preferences RLS initplan migration) merged as `428d42b52e2c917969ced3a11ba2eca7987cc4c0`; exact-head CI #929 passed. No live migration was applied.
- PR #19 (private FreeLLMAPI reverse proxy and strict named-profile allowlist) merged as `36d4fa7d1491e44c5f97a0bab9800858def45815`; exact-head CI #934 passed, including build, tests, lint, provider privacy, isolated Supabase migrations, SQL isolation, two-user integration and CORS. This is a development-branch merge only; no gateway deployment, tunnel, secrets or inference.
- PR #23 (account-scoped provider consent and privacy-separated Multi-AI routing) is READY FOR REVIEW, not merged. Code head `e67fd6ff53650888332a71bb9ff887162c74e6a2` passed exact-head CI #948, including typecheck/build, tests, lint, Deno, isolated local Supabase migrations, SQL isolation, two-user integration and CORS. A documentation-only follow-up commit `5a8515ec22605712a8696853b1f015651fc3f493` added the updated FreeLLMAPI integration contract after CI; no application code changed after CI. Do not self-approve or merge; human review is required.
- PR #23's Vercel status is blocked by the Hobby 100-deployments/day limit; no paid upgrade attempted. GitHub CI is the successful source validation for the code head.
- PR #13 remains OPEN/Draft and divergent. Its provider-consent code has been selectively ported to PR #23; duplicate migration `20261113110000_jarvis_provider_preferences.sql` remains excluded. Close PR #13 only after human review/merge of PR #23 and final changed-file reconciliation.
- PR #16 is closed as superseded by PR #17.

### Supabase live verification
- Project `Jarvis`: ACTIVE_HEALTHY, region `eu-west-3` (Paris), PostgreSQL 17.11.0.018.
- Read-only SQL: `jarvis_provider_preferences` row count = 0; migration history includes exactly `20261113125425` and `20261113125437`. Both provider pools remain default-off and no account preference was written.
- Production `jarvis-api` remains ACTIVE v32; Preview `jarvis-preview-api` remains ACTIVE v23. No function deployment or secret read occurred.
- Security advisor: one INFO `rls_enabled_no_policy` for `jarvis_rate_limits`; current table grants are restricted to postgres/service_role and the rate-limit RPC EXECUTE is service_role-only. Do not add public policy to silence the informational lint. One WARN: leaked-password protection disabled. This Auth security setting was not changed and requires a separate security decision.
- Performance advisor: 18 unused-index INFO findings on low-traffic data. No index was removed.

### Cloudflare live verification
- Account API read-only inventory: zero Worker scripts, zero AI Gateway gateways.
- AI Gateway billing credit balance = 0; no default payment method; auto top-up threshold = 0 and amount = 0.
- Current account plan / Workers AI paid-tier entitlement could not be established from this response. Do not infer that all catalog models are free. No Worker/gateway/secret/tunnel or paid plan was created.

### PR #23 feature scope and remaining gates
- Adds typed provider-preferences contract/client, authenticated rate-limited GET/PUT routes, per-account ZDR/standard pool toggles, strict-ZDR-only automatic memory extraction, named-only FreeLLMAPI routing, provider policy v2 consent, global Cloudflare processing disclosure, Brazilian Portuguese errors, CORS regression tests and two-user preference enable/revoke isolation tests.
- Both pools remain disabled. No provider key/secret was read, no model inference was called, no user prompt/audio was transmitted.
- The new consent notice explicitly states Cloudflare Workers AI is global inference infrastructure and no EEA-only inference guarantee has been verified. FreeLLMAPI downstream providers retain their own processing regions, retention and training terms.
- Before any provider activation, create and audit a concrete provider manifest and named FreeLLMAPI fallback chain: current free quota/reset, payment-method requirement, hard no-overage/no-paid-fallback controls, Ireland/EEA eligibility, personal-use terms, retention/training, processing region, source URL and verification date. A named profile alone is not proof.
- The updated `docs/cloud/FREELLMAPI_CLOUD_INTEGRATION.md` is included in PR #23. Its final documentation-only commit was not rerun through CI; the code head remains the CI #948 tested head.

### iOS, integrations, CFO and self-evolution
- Native iOS decision remains Capacitor 8 around React/Vite, not a full SwiftUI rewrite. No Capacitor config, dependency, iOS project, Keychain plugin wiring, native voice adapter, signed IPA, or TestFlight build exists. Node 22+ and macOS/Xcode 26+ are required; current tools do not provide macOS/Xcode. No paid build service should be provisioned.
- The plugin-neutral native secure-token adapter and tests already exist, but are not wired to a concrete Capacitor plugin.
- BMW, Blink, Dreame, messaging, Maps/CarPlay and generic integration registry remain design/feasibility work; no direct vendor action has been verified.
- Family CFO currently has synthetic-first pure validation/calculation functions and tests (decimal arithmetic, currency safety, transaction fingerprints, conservative transfer matching and cash flow). No CFO tables, financial imports, bank connectors or live account balances were created/read. Follow the data contract and review schema/RLS/consent together before any migration.
- Self-Evolution observer remains read-only/non-production. Observer Validation #142 and canonical CI #945 passed on the prior canonical ledger head `a88a1bc3967d6026ba53e2385289cacffd37da07`. No production self-modification or autonomous deployment.

## 2026-11-13 — parallel workstream reconciliation (session continuation)

Canonical development head before this ledger update: `f217feccdaceddfc12a72437fcb7e7a3125ad296`. No production deployment, production migration, secrets, account settings, billing settings, or live financial data were changed in this pass.

### PR and branch status verified
- **PR #22 — Family CFO read-only persistence:** branch `work/family-cfo-readonly-finite-v2`, head `7e8561656ec9994ddfc15d628d22d69db888f415`, exactly one commit ahead of canonical and not behind. The first CI attempts (#946/#947) failed because three SQL tests expected check-constraint code 23514 for infinity values, while PostgreSQL `numeric(20,2)` rejects them earlier with numeric overflow 22003. The current branch test file expects 22003 for positive/negative infinity and retains the NaN constraint assertion. Exact-head CI #959 completed successfully. Migration remains proposed only; it has not been applied to live Supabase. PR remains open for review.
- **PR #27 — Family CFO transfer confidence:** branch `work/cfo-transfer-confidence`, head `20e2dcc83f4d58f91c3a7afd9d863e6e7b699df8`, one commit ahead of canonical. Internal transfers are now excluded only when posted, confirmed, and confidence is `verified` or `user_confirmed`; tests cover estimated/unknown confidence. Exact-head CI #961 was still running at reconciliation; do not merge until it completes successfully.
- **PR #26 — action approval primitives:** branch `work/cloud-action-approval-core`, head `9280b038ab9be4f71007f3f9e5771f10f3c2ca37`, two commits ahead of canonical. Adds a 64 KiB argument cap, strict JSON canonicalization, 10-minute expiry validation, digest/context binding and fail-closed unknown-capability handling. CI #965 was cancelled; a rerun was requested and was queued at reconciliation. This remains a pure domain foundation: no persistence, UI, route, vendor execution or authorization to act.
- **PR #25 — Preview health observer:** branch `work/observer-preview-api-health`, head `803f86a577625382fcd0fa5b09149fde27ac5f1d`. CI #955 and Observer Validation #144 both passed. The branch is one commit ahead and one behind canonical; do not merge as-is. The check is read-only and validates public Preview API health with a timeout and expected JSON payload.
- **PR #23 — provider consent / FreeLLMAPI routing:** branch `work/provider-consent-app-integration`, head `983133f8a8046fb2874124a16216b38676f898ba`, three commits ahead and zero behind canonical. Latest CI #966 was queued at reconciliation; earlier run #963 was cancelled. Do not treat the previous #948 pass as exact-head evidence for this later branch state. Provider pools remain default-off; no inference or provider content transfer occurred. Downstream provider identity/fallback-count diagnostics and zero-cost/EEA eligibility verification remain release blockers.

### Review and safety gates
- Keep all five PRs open until their exact current heads pass CI and their diffs are reviewed. Do not self-approve or merge them as a batch.
- Keep PR #25's branch divergence unresolved until a safe, selective rebase/cherry-pick is prepared; do not force-push a reconstructed full tree.
- Do not apply the Family CFO migration to live Supabase. No CFO tables or personal financial records have been created/imported.
- No FreeLLMAPI host, tunnel, provider secret, inference request, paid plan, or automatic billing path has been activated.
- No iOS project, Xcode build, signed IPA, TestFlight, or physical-device verification is claimed by this pass.

### Next actions
1. Verify completion of CI #961 (PR #27), queued reruns #965 (PR #26) and #966 (PR #23); inspect failed job logs rather than guessing.
2. Review PR #22 schema/RLS and exact-head CI #959 before human merge decision.
3. Prepare a safe canonicalized PR for the Preview observer change without overwriting canonical ledger or unrelated files.
4. Continue with app MVP work only after checking the current canonical tree and preserving the amber UI and existing-account auth path.
5. Keep this master record as the sole project ledger; update it again after the next verified state transition.

## 2026-11-13 — follow-up CI state refresh

- PR #27 exact-head CI #961 has now completed successfully on `20e2dcc83f4d58f91c3a7afd9d863e6e7b699df8`. The confidence gate remains a pure calculation change and does not touch financial records.
- PR #26 advanced during the review to head `a6376822161b145dc7918771209c0b4b5b071c00`; it now also rejects malformed protocol versions and revalidates the persisted approval TTL (positive and no more than ten minutes), with tests for rejected decisions and invalid envelopes. Compare against the updated canonical head `23cb46722ff7c2a348cfea97dc0ab4dcf2387a06`: four commits ahead, one behind (the ledger-only canonical update). Its latest CI #969 was cancelled before a job was created; exact-head CI is still required. Do not assume the earlier #965 attempt validates this later head.
- PR #23 exact-head CI #966 is still in progress; at the last check it had reached the isolated local Supabase setup stage. No pass is claimed yet.
- PR #22 exact-head CI #959 remains successful on `7e8561656ec9994ddfc15d628d22d69db888f415`; its one-commit branch is aligned with the canonical base. Migration remains unapplied to production.
- PR #25 exact-head CI #955 and Observer Validation #144 remain successful, but its branch is still divergent from canonical and must not be merged as-is.
- Canonical development branch now points to `23cb46722ff7c2a348cfea97dc0ab4dcf2387a06` after the project-ledger reconciliation commit. No production deploy or live database change was performed.

Next: allow PR #23 CI #966 to finish; obtain a fresh exact-head CI run for PR #26 after its branch stabilizes; keep all merges behind review and retain the €0/no-production-mutation gates.

## 2026-11-13 — latest isolated-branch test hardening

- PR #26 advanced to `1447d916dfa1de63dcc23c6334a69231db0a13ad` with two additional negative assertions: malformed decision digests and malformed envelope digests are rejected. The existing branch also revalidates protocol version and the maximum ten-minute TTL at decision time. Exact-head CI #971 is pending; no pass is claimed.
- PR #23 remains at `983133f8a8046fb2874124a16216b38676f898ba`; exact-head CI #966 is still in progress. No provider pool or inference has been activated.
- Canonical ledger head before this update is `feca87a44b04069ab1ab8eac4840e7522fa26c45`. Canonical CI #970 and Observer Validation #146 were in progress at the last check; no result is claimed yet.
- PR #27 exact-head CI #961: success. PR #22 exact-head CI #959: success. PR #25 CI #955 and Observer #144: success, but branch divergence remains. These PRs remain open for review; none was merged in this pass.
- This update records test/branch state only. No production deployment, migration, user data, credentials, provider inference, or billing settings were changed.

## 2026-11-13 — branch divergence refresh after ledger commits

The canonical branch has three additional documentation-only ledger commits after `f217feccdaceddfc12a72437fcb7e7a3125ad296`. A fresh GitHub compare against the current canonical branch reports:
- PR #23 provider consent: 4 commits ahead / 3 behind.
- PR #26 action approvals: 5 ahead / 3 behind.
- PR #27 CFO transfer confidence: 1 ahead / 3 behind.
- PR #22 CFO read-only persistence: 1 ahead / 3 behind.
- PR #25 Preview observer: 1 ahead / 4 behind (its older base also predates the f217 ledger commit).

The three commits after f217 on canonical are ledger-only updates to `JARVIS_MASTER_RECORD.md`; no source-code changes were introduced by them. The divergence is therefore documentation/ancestry drift, not proof of code conflict. Do not force-push or reconstruct full branch trees. Before any merge, inspect the actual PR mergeability/diff and ensure the current canonical ledger remains intact. Exact-head CI remains the merge gate; review remains human-owned.

Latest verified CI at this checkpoint: PR #27 #961 success; PR #22 #959 success; PR #25 #955 and Observer #144 success; PR #23 #966 in progress; PR #26 #971 pending. Canonical CI #970 and Observer #146 were in progress at the prior check. No merge or production change is authorized by this status note.


## 2026-11-13 — verified multi-front handoff (late session)

### Canonical development and repository continuity
- Canonical development branch: `work/jarvis-canonical-integration`, verified head `86d171b3e869bee138795342963995adaa302b93`. No merge to `main` or production deployment was performed.
- `laurofiorenzani/jarvis` is the active implementation repository. Its default `main` branch is not the current canonical integration target; the GitHub compare currently reports 606 commits ahead / 3 behind from canonical to main, so do not merge or force-reconcile this history without a separate review.
- `laurofiorenzani/jarvis-personal-cloud` is a separate private, older planning/documentation workspace (last pushed 2026-11-10). Its documents describe an earlier local-first plan and an earlier scope; current project instructions are cloud-first. It was read for continuity only and was not changed, deleted or archived. Decide later whether to migrate any still-relevant documents into the active repo and archive it; do not destroy it without approval.
- Keep `JARVIS_MASTER_RECORD.md` as the single active project ledger. Other handoff/status files named in the project instructions were not found in the active repo tree during this pass; do not create duplicate ledgers until their intended canonical location is agreed.

### Completed / merged into canonical development
- PR #17 STT daily-quota classifier: merged; exact-head CI #926 and canonical CI #928 passed; Observer #139 passed.
- PR #18 applied-migration source provenance: merged; exact-head CI #929 passed. It restored only the source file for an already-applied migration; no live migration was run.
- PR #19 private FreeLLMAPI reverse proxy with named-profile allowlist: merged as `36d4fa7d1491e44c5f97a0bab9800858def45815`; exact-head CI #934 passed. The gateway package is source-only; no host, tunnel, secret, provider key or inference was deployed.
- PR #16 is closed as superseded by PR #17.

### Current open PRs — exact heads and validation
- PR #23 provider preferences / privacy pools / FreeLLMAPI integration: READY FOR REVIEW, not merged. Head `2e9f3de2ddc0cdf46464e3f385aff97e5e54fbc3`, base canonical `86d171b3e869bee138795342963995adaa302b93`. Exact-head CI #982 passed, including build/typecheck, tests, lint, Deno, provider privacy, isolated Supabase migrations, SQL isolation, two-user provider-preference integration and CORS. Added bounded, sanitized diagnostics for configured provider/profile, downstream route (when returned by gateway) and fallback-attempt count in the Diagnostics panel. No prompts, credentials or raw fallback trail are exposed.
- PR #23 remaining release gates: both provider pools remain default-off; live provider-preferences row count is zero; no provider secret was read and no inference request was sent. A concrete named FreeLLMAPI fallback profile still needs a documented provider manifest proving free quota/reset, no payment method, no overage/paid fallback, Ireland/EEA eligibility, personal-use terms, retention/training and processing region. Physical iPhone PT-BR/English STT → model → audible TTS E2E is not complete. Vercel Hobby 100-deployments/day limit remains; no paid upgrade.
- PR #26 action-approval primitives: READY FOR REVIEW, not merged. Head `59e454969cf3f2875b18ee50dfea48b98c9e3425`, base canonical `86d171b3e869bee138795342963995adaa302b93`. Exact-head CI #979 passed. Pure foundation only: risk classification, canonical JSON/SHA-256 argument digest, 64 KiB argument bound, digest-only envelope, max 10-minute TTL and user/session/invocation/capability/digest binding. It does not persist approvals, perform atomic database transitions, expose approval UI or execute external actions.
- PR #27 CFO transfer pairing: READY FOR REVIEW, not merged. Head `4c31dc2032b4217a887f483b3ec943e1647fbbe0`, base canonical `86d171b3e869bee138795342963995adaa302b93`. Exact-head CI #987 passed. Cash-flow exclusion now requires a shared `internalTransferPairId` explicitly assigned after user review, plus a unique one-to-one match and owner/currency/account/amount/date/confidence checks. Amount/date/confidence heuristics alone never exclude records; unpaired records remain in totals. Pure calculations/tests only; no financial records accessed.
- PR #22 Family CFO read-only persistence: remains DRAFT, not merged. Head `c3d3edc2ed91f88994cb93bb6acc7843f09992c0`, base canonical `86d171b3e869bee138795342963995adaa302b93`. Exact-head CI #984 passed, including isolated migration reset, SQL RLS/isolation, two-user integration and CORS. No live migration or personal financial data was used. Explicit reviewed transfer-pair IDs are in the proposed schema. Merge is blocked pending a currency precision decision: `NUMERIC(20,2)` plus a three-letter regex is not ISO-4217 validation and does not support 0-/3-decimal currencies. Decide either a documented two-decimal v1 allowlist or currency-specific minor-unit support; clarify account vs original merchant currency for FX/card purchases.
- PR #25 Preview read-only observer: remains DRAFT. Current head `431cb78a31e439f94a048754b3a8d9ae5195c730`, base canonical `86d171b3e869bee138795342963995adaa302b93`. Latest final-head CI #993 and Observer Validation #155 were cancelled before completing; earlier CI #977 and Observer #149 passed on a prior head only. Latest source now validates Production and Preview health JSON `status: ok`, scopes CI metadata to canonical push runs, and adds a static test for read-only permissions/GET-only bounded health checks. Do not mark ready or merge until a fresh exact-head CI and Observer Validation complete.
- PR #13 remains OPEN/Draft and divergent; its provider integration work has been selectively ported into PR #23 and its private proxy into PR #19. Do not close until PR #23 has human review/merge and a final changed-file reconciliation. Exclude its duplicate migration `20261113110000_jarvis_provider_preferences.sql`.

### Live platform verification — read-only
- Supabase `Jarvis`: ACTIVE_HEALTHY in `eu-west-3` (Paris), PostgreSQL 17.11.0.018. `jarvis_provider_preferences` row count remains 0; migration history contains `20261113125425` and `20261113125437`. Production `jarvis-api` remains ACTIVE v32; Preview `jarvis-preview-api` remains ACTIVE v23.
- Supabase security advisor: `jarvis_rate_limits` INFO finding is intentional under current service_role-only grants/RPC execution; no public policy added. Auth leaked-password protection remains disabled (WARN); not changed because it is a security-setting decision. Eighteen unused-index INFO findings remain; no index removed.
- Cloudflare API inventory: zero Worker scripts and zero AI Gateway gateways; AI Gateway credit balance 0; no default payment method; automatic top-up threshold/amount 0. Account plan / Workers AI paid-tier entitlement remains unverified. No worker, gateway, tunnel, secret, paid plan or provider inference was created.
- Vercel Preview is constrained by the Hobby 100-deployments/day limit. No paid upgrade or quota bypass.
- No production Edge Function, Vercel alias, database schema/data, auth setting, provider secret, provider preference, billing setting or user data was changed in this pass.

### Native iOS, integrations and Family CFO readiness
- No native Swift/Xcode or Capacitor iOS project, signed IPA, TestFlight build or physical-device E2E exists. The remembered hardware status is that the user has no personal Mac mini/macOS build host; only a company Windows laptop was available in earlier project context. Do not claim local Xcode capability or use the company laptop as a 24/7 server. Any macOS CI/build route must be verified for zero recurring cost before use.
- BMW, Blink, Dreame, WhatsApp, Instagram, Maps/CarPlay and bank connectors remain unimplemented or feasibility-only; no vendor action is claimed.
- Family CFO has synthetic-first pure calculation functions and proposed read-only schema only. No CFO tables are live, no bank import/connector is active, and no household balances or transactions were read.
- Observer remains read-only; no autonomous production self-modification or deployment.

### Human decisions / next gates
1. Review PR #23 and PR #26; do not self-approve or merge.
2. Resolve PR #22 currency precision/ISO-4217 contract before the Family CFO schema is approved.
3. Complete a fresh exact-head CI + Observer Validation for PR #25; keep it Draft until both pass.
4. Review PR #27 explicit transfer-pair logic before merging.
5. Decide whether to consolidate the private historical planning repo into the active implementation repo; preserve it until approved.
6. Decide whether to enable Supabase leaked-password protection; no auth security setting is changed without approval.
7. Do not enable any provider pool until the provider manifest and per-account consent are complete; no paid fallback or recurring spend.
8. Continue native iOS only with a verified zero-recurring build/signing path; no App Store/paid developer subscription is authorized.

No new PRs were merged, no live migrations were run, and no production deployment occurred in this handoff.


## 2026-11-13 — final verification after canonical ledger update

### Canonical validation
- Canonical development commit `6a49b18309dd5a07465875877248d15f365b395f` is documentation-only (master-record reconciliation).
- GitHub Actions CI #995 completed SUCCESS on this canonical commit, including build/typecheck, unit tests, lint, Deno, isolated Supabase migration reset, SQL isolation, authenticated two-user integration and Production/Preview CORS smoke tests.
- Observer Validation #157 completed SUCCESS on the same canonical documentation update.
- No production Edge Function, schema, data, auth, provider secret, billing setting or Vercel production alias was changed.

### Vercel read-only deployment inventory
- Connected Vercel team is on the Hobby plan; project `jarvis` is linked to `laurofiorenzani/jarvis`, Vite framework, Node.js `26.x`. No password or SSO protection is configured at project level.
- Production deployment `dpl_A2N9bTRehxSzDzb3wC9zY5vT9r1Q` is READY from legacy `main` commit `9ae5ec846b6b20a17b2d264e699d6234c4284b23`; aliases include `jarvis-lauro-fiorenzani.vercel.app` and `jarvis-git-main-lauro-fiorenzani.vercel.app`. The production URL returned the Vite app shell successfully.
- Latest canonical-branch Preview deployment is READY at older commit `b18af5a36938a5ae3521d277075957527f16c9c6`, not current canonical `6a49b183...`; its preview URL returned the app shell successfully.
- The most recent general Preview deployment was from an older PR #27 head `7bb5...`. Direct SHA lookups for the current PR #22, #23, #25, #26 and #27 heads returned no Vercel deployment. Therefore none of the current PR heads has a verified Vercel Preview deployment.
- The canonical commit's Vercel check did not deploy because the Hobby 100-deployments/day limit was reached. No deployment was forced, no paid upgrade was attempted, and no quota bypass was used. Keep the existing Production alias unchanged until a reviewed release and free deployment capacity are available.

### PR branch alignment
- PRs #22, #23, #25, #26 and #27 were last based on canonical commit `86d171b3...`; canonical has since advanced to `6a49b183...` with a documentation-only master-record commit. All require a selective rebase/read-back before merge. Do not overwrite the canonical ledger while rebasing; preserve current source and tests and re-run exact-head CI after rebasing.
- PR #23 exact-head CI #982 passed; PR #26 exact-head CI #979 passed; PR #27 exact-head CI #987 passed; PR #22 exact-head CI #984 passed. PRs #23/#26/#27 are Ready for Review, not merged. PR #22 remains Draft pending currency minor-unit decision.
- PR #25 current head `431cb78a...` includes the production JSON health check, canonical-push CI query scope, workflow path filters and static read-only contract test. Its latest CI #993 and Observer Validation #155 were cancelled before completion; earlier #977/#149 pass on the prior head does not validate the current head. Keep Draft.
- No Vercel Preview exists for the current PR heads, so GitHub CI is the authoritative code validation for now; it does not replace browser/device E2E.

No PR #22–#27 was merged. No new deployment, live migration, provider activation or paid service was created.


## 2026-11-13 17:01 Dublin — continuity and parallel-work verification

### Canonical repository and integration candidate
- Read-only GitHub verification confirms the active implementation repository is `laurofiorenzani/jarvis`; default branch remains `main`.
- The canonical development branch `work/jarvis-canonical-integration` is at `069664cd5bcccdbf28d85b91a44cb3de6503cbaa`, represented by open PR #12 targeting `work/intelligent-memory-foundation` (not `main`). PR #12 is Ready for Review and GitHub currently reports it mergeable, but it has not been merged. Exact-head CI #997 and JARVIS Observer Validation #158 both completed successfully on this commit.
- Do not equate “mergeable” with release approval: PR #12 is a large integration candidate and production remains a separate release gate.

### Parallel PR validation snapshot
- PR #22 Family CFO persistence: head `c3d3edc2ed91f88994cb93bb6acc7843f09992c0`; exact-head CI #984 SUCCESS; remains Draft. The read-only migration is CI-tested only and has not been applied to live Supabase. Currency validation remains unresolved: the current three-letter regex does not prove ISO-4217 validity or define supported minor units.
- PR #23 provider consent / routing: head `2e9f3de2ddc0cdf46464e3f385aff97e5e54fbc3`; exact-head CI #982 SUCCESS; Ready for Review but not merged. Provider pools remain disabled; provider terms/eligibility, zero-billing hard cap, per-account consent and synthetic inference verification remain release gates.
- PR #25 Observer: head `725e1bbdf7ef8a68b34f9f3c7a7c6b960bd47a5b`; no PR-triggered workflow run was returned for this exact head. Keep Draft; earlier CI/Observer passes on older heads do not validate this head.
- PR #26 action-approval primitives: head `59e454969cf3f2875b18ee50dfea48b98c9e3425`; exact-head CI #979 SUCCESS; Ready for Review but not merged. It is a pure validation foundation, not persisted approvals, UI or external action execution.
- PR #27 CFO transfer pairing: head `4c31dc2032b4217a887f483b3ec943e1647fbbe0`; exact-head CI #987 SUCCESS; Ready for Review but not merged. Exclusion requires a shared explicit user-confirmed pair ID; unpaired transactions remain in cash flow.
- PR #28 iOS secure storage: head `abac40a19f2adb730b328258a76d8f4de80d3510`; documentation follow-ups are beyond the code head `56c6e5cccf1337e25388e3a1a1683ac1b2915c6d`, whose CI #996 passed. The adapter is not wired into an iOS app; no Capacitor package/project, Xcode build or physical-device test exists. No exact-head workflow run was returned for the documentation-only head.

### Release and platform boundary
- Latest PR #12 review comment at 16:52 UTC identifies a material Production/Preview mismatch: production `jarvis-api` v32 still contains Gemini STT/TTS calls, while Preview `jarvis-preview-api` v23 contains the Cloudflare Whisper route and Gemini restriction. Supabase connector cannot inspect Edge Function secret presence/values. No secret was read, no inference was sent and production was not changed.
- Keep production promotion blocked until provider-policy parity is reviewed, Preview is validated with synthetic data, owner-only secret setup is completed securely, both accounts' provider-consent gates are satisfied, and physical iPhone PT/EN end-to-end is proven.
- Vercel Hobby deployment cap remains a blocker for fresh previews. Do not upgrade, bypass quota or use a stale Preview as validation.
- No PR was merged; no production deployment, migration, account/auth change, provider activation, secret change or billing change was performed during this verification.

### Next parallel actions
1. Resolve the Family CFO v1 currency contract before any schema approval: either a documented two-decimal currency allowlist with rejection of unsupported codes, or a currency-specific minor-unit design. Preserve account settlement currency separately from original merchant currency where FX applies.
2. Review the latest PR #23 consent UX and provider routing against the two-account isolation gate; keep both provider pools default-off until explicit per-account acceptance and a verified free/no-overage provider manifest.
3. Obtain a fresh exact-head CI plus Observer Validation for PR #25; keep it Draft until both pass.
4. Reconcile PR #22–#28 selectively with the latest canonical ledger; do not force-push or merge branches in bulk.
5. Continue iOS architecture only along a verified zero-recurring macOS/Xcode route; do not claim a native app exists.
6. Preserve PR #12 as the current integrated candidate and keep Production unchanged until every release gate is satisfied.

This checkpoint is a read-only state reconciliation plus documentation update. It does not mark any unshipped capability as complete.


## 2026-11-13 — live continuation checkpoint (17:xx UTC)

### Verified repository state
- Active implementation repository: `laurofiorenzani/jarvis`; default branch `main` remains at `da4e4591a0fe364ba5823d44ee2954b88ffd3383` (separate from the canonical development branch).
- Canonical development branch `work/jarvis-canonical-integration` is currently at `86fd7cc6c52f23b3eaa206f9e3ac5b0ff0d46588`. The branch inventory confirms many parallel work branches; do not bulk merge/rebase them.
- PR #12 represents the canonical integration branch and is still open. Its latest Observer Validation run #159 (GitHub Actions run 43468758192) completed SUCCESS on exact head `86fd7cc6...`; job 132034792079 passed observer privacy/triage tests, typecheck/build and lint. This is validation of the observer workflow, not a production release or full deployment validation.
- Current open PR heads observed: #22 CFO schema `c3d3edc...`; #23 provider consent `2e9f3de...`; #25 Observer `725e1bb...`; #26 action approval `59e4549...`; #27 transfer pairing `4c31dc2...`; #28 iOS secure storage `abac40a...`. Their descriptions and previous validation claims remain as recorded above; no PR was merged in this pass.

### Newly confirmed details / release boundaries
- PR #25 latest head is `725e1bb...`, and its body records exact-head CI #994 / Observer #156 success on an earlier code head `431cb78...`; do not transfer that pass to the current head without exact-head CI evidence.
- PR #28 remains adapter-level preparation only. No Capacitor app wiring, Xcode build, physical iPhone test, IPA or TestFlight build is evidenced. Apple Developer Program distribution would violate the recurring-cost target; do not introduce it.
- Canonical Observer Validation #159 is green, but Vercel Hobby deployment quota, stale production/preview mismatch and provider-consent/secret/device gates remain release blockers as already documented.
- The standard project docs `PROJECT_STATUS.md`, `NEXT_SESSION.md`, `TASK_REGISTRY.md`, `DECISIONS_LOG.md`, and `DEPLOYMENT_STATUS.md` were not found at repository root on the canonical branch. Do not create duplicates until repository tree confirms whether they live under another directory. This master record remains the only confirmed continuity ledger in this check.

### Work performed in this pass
- Read-only reconciliation of repository branches, open PR metadata, canonical Observer run/job and the existing master record.
- No code, live Supabase data/schema, production deployment, secrets, billing or account settings were changed. No new code commit or PR was created.

### Next actions (parallel, safe)
1. Locate the canonical documentation directory/tree and map the requested continuity documents without creating duplicates.
2. Obtain exact-head CI for PR #25 `725e1bb...`; keep it Draft until the exact head passes.
3. Review PR #26 action-approval domain tests and identify the next server-side persistence/UI slice without enabling execution.
4. Resolve the Family CFO currency minor-unit contract before approving PR #22; preserve the synthetic-only/read-only boundary.
5. Continue provider manifest and zero-cost eligibility verification before any provider activation; both provider pools remain default-off.
6. Keep all production resources unchanged until release gates and human review are complete.

This checkpoint is an evidence-based status update, not a declaration that JARVIS is complete or production-ready.


## 2026-11-13 — parallel continuation / hosting re-verification

### Verified positive change: Vercel Preview capacity
- The earlier Hobby deployment-rate failure is no longer blocking every deployment: Vercel accepted a fresh Git Preview for the canonical branch at exact commit `5d6b4edfeee838f57a7bf75298b8d650b46e8f50`.
- Deployment ID `dpl_HnjDEdsBZTGd21NKmQSoHR3KGVBr`, state READY, source Git, branch `work/jarvis-canonical-integration`, exact SHA `5d6b4ed...`. Preview alias: `https://jarvis-git-work-jarvis-canonical-integration-lauro-fiorenzani.vercel.app`.
- The GitHub commit status for this exact SHA reports context `Vercel` = SUCCESS / “Deployment has completed”. This proves deployment readiness only, not browser UX, API, authentication, account isolation or production health. Production alias was not changed. Team remains Hobby; no upgrade or billing change.

### CI state on current canonical checkpoint
- GitHub CI run #1000 (run ID `43472284595`) started on exact commit `5d6b4ed...`. Typecheck/build, app tests, lint, provider privacy routing, semantic-memory policy, Edge Function type-check and speech extraction tests all completed SUCCESS. Isolated Supabase startup was still in progress at the time of this observation; migration, SQL isolation, two-user integration and Production/Preview CORS smoke tests were pending. Do not label CI #1000 complete until GitHub reports a final conclusion.
- Observer Validation #159 remains SUCCESS on prior canonical code head `86fd7cc...`; the checkpoint commit changes only the master ledger.

### Live Supabase / Cloudflare read-only snapshot
- Supabase project `Jarvis` (`undmhmdwhxvjgvezvucy`) remains ACTIVE_HEALTHY, region `eu-west-3`, PostgreSQL 17.11.0.018.
- Live Edge Functions remain `jarvis-api` ACTIVE v32 and `jarvis-preview-api` ACTIVE v23. Applied migration history ends with `20261113125425_jarvis_provider_preferences` and `20261113125437_provider_preferences_rls_initplan`; no Family CFO migration appears in live history.
- Security advisor still reports the intentional service-role-only RLS table `jarvis_rate_limits` as INFO and leaked-password protection disabled as WARN. No auth/security change was made. Health advisor returned no lints.
- Cloudflare account inventory currently returns zero Worker scripts. No Worker, AI Gateway, secret, inference, bucket or billing configuration was created/changed. JARVIS therefore still has no Cloudflare-hosted Worker runtime; Cloudflare Workers AI remains only a candidate provider route in source, not a verified active provider.

### Continuation actions and limits
- Preserve PR review gates: do not merge #22–#28 in bulk, do not apply CFO migrations, do not activate provider pools, and do not promote Production.
- The five continuity docs other than `JARVIS_MASTER_RECORD.md` were not present in the root tree at canonical HEAD; the repository tree contained 219 paths and only this master ledger matched the requested document names. Treat this as a single-file continuity ledger for now; do not create duplicate root docs.
- Next: confirm CI #1000 final result; run read-only preview smoke checks against the new exact-head Preview; separately obtain exact-head CI/Observer evidence for PR #25; continue CFO currency-contract design without choosing a financial policy on the user's behalf.
- No live database, user data, provider secrets, production deployment, auth setting or billing configuration was changed in this continuation.


### Follow-up workflow result — 2026-11-13
- Observer Validation run `43472284650` completed SUCCESS on exact checkpoint commit `5d6b4edfeee838f57a7bf75298b8d650b46e8f50`.
- Full CI run `43472284595` for the same commit remains IN_PROGRESS. At last observation, typecheck/build/tests/lint, provider privacy, semantic-memory policy, Edge Function type-check and speech tests had passed; isolated Supabase teardown was running. No failure was reported, but do not mark the run green until it completes.
- A subsequent documentation-only master-ledger commit `643d4ba580ffbae3409d2035c1ec43cc841db25b` was created after the Vercel Preview build. The READY deployment therefore corresponds to `5d6b4ed...`, not this later docs-only commit; no source code changed between them.


## 2026-11-13 — autonomous parallel continuation handoff (17:xx UTC)

### Canonical branch and exact-head validation
- Canonical development branch: `work/jarvis-canonical-integration`, source HEAD at start of this checkpoint: `a969f3c1119b6ebd42aaef9058e94fec6bb521d3`.
- Full CI run #1002 (`43472746549`) completed SUCCESS on that exact SHA. This includes typecheck/build, app tests, lint, provider privacy tests, semantic-memory policy tests, Edge Function type-check, speech tests, isolated local Supabase startup/migrations, SQL isolation tests, two-user semantic-memory API integration and deployed cloud/Preview CORS smoke tests.
- Observer Validation #162 (`43472746764`) completed SUCCESS on the same exact SHA.
- The previous CI #1000/#1001 cancellations are superseded by the successful #1002 exact-head run; no failure was reported for #1002.
- Independent exact-head CI also remains SUCCESS for PR #23 provider consent (`2e9f3de2ddc0cdf46464e3f385aff97e5e54fbc3`, run `43464685923`), PR #22 Family CFO schema (`c3d3edc2ed91f88994cb93bb6acc7843f09992c0`, run `43464989072`), and PR #26 action-approval primitives (`59e454969cf3f2875b18ee50dfea48b98c9e3425`, run `43464555830`). These are branch-level CI passes, not approval to merge or deploy.
- Observer branch `work/self-evolution-readonly-observer` is at `2249853a157f5e6b1782ce202c6c70998604d864`; its Observer Validation run `43452601059` and CI run `43452600850` completed SUCCESS. This is an earlier isolated branch head, not current canonical integration.

### PR review and merge boundaries
- PR #25 remains DRAFT at exact head `725e1bbdf7ef8a68b34f9f3c7a7c6b960bd47a5b`. Latest passing CI and Observer Validation found for that branch are on older head `431cb78a31e439f94a048754b3a8d9ae5195c730`; do not transfer those passes to current head. Keep draft until exact-head validation is obtained.
- PR #12 is the canonical integration candidate and is still open. No PR was merged in this checkpoint.
- PR #22 CFO, #23 provider consent, #26 action approval and #27 transfer pairing remain separate changes. Do not bulk merge or apply migrations.
- PR #28 remains a secure-storage adapter and tests only. The package/native project is not installed; no Xcode build, signing, IPA/TestFlight or physical-device verification is evidenced. Vercel Hobby deployment limit was reached (>100 deployments/day); no upgrade or workaround is allowed.

### Financial schema review
- PR #22 adds owner-scoped accounts, transactions and balance snapshots, authenticated SELECT-only RLS, service-role DML and synthetic two-user isolation tests. Its exact-head CI passes.
- Important unresolved contract: migration currently uses `numeric(20,2)` while accepting any three-letter currency code. Do not merge/apply until the product contract chooses and documents currency-specific minor-unit precision or a restricted supported-currency allowlist, and addresses original-vs-settlement currency for FX. No live migration was applied; synthetic-only/read-only boundary remains.

### Multi-AI and privacy review
- PR #23 exact-head CI passes. FreeLLMAPI is accepted only through the separate standard provider pool, HTTPS, server-side key reference and named `auto:<profile>` route; both account pools remain default-off pending per-account consent and verified zero-billing/downstream provider manifest.
- Gateway response headers such as `X-Routed-Via` and fallback trail are post-inference diagnostics, not preventive privacy controls. Do not send personal content through the gateway until the exact active downstream chain has been independently attested before inference and no paid/overage path is possible.
- No inference request, secret read/write, provider activation or billing change occurred.

### Live platform state — read-only
- Supabase project remains ACTIVE_HEALTHY; production `jarvis-api` ACTIVE v32 and `jarvis-preview-api` ACTIVE v23. Applied migrations still end at `20261113125437_provider_preferences_rls_initplan`; no CFO migration exists in live history.
- Security advisor continues to report `public.jarvis_rate_limits` RLS-without-policy as INFO (consistent with service-role-only design pending source confirmation) and leaked-password protection disabled as WARN. No auth setting changed.
- Latest Vercel canonical Preview deployment remains READY on older commit `5d6b4edfeee838f57a7bf75298b8d650b46e8f50`, alias `https://jarvis-git-work-jarvis-canonical-integration-lauro-fiorenzani.vercel.app`. It is not a deployment of current canonical SHA `a969f3c...`. Do not claim current-head browser smoke-test or deploy.
- Cloudflare account still has no deployed Worker runtime per the last inventory. No resources, secrets, billing or inference were changed.

### Work performed and next parallel actions
- Reconciled current canonical CI/Observer outcomes, exact-head branch CI evidence, PR #25 current head, Supabase functions/migration/security state and latest Vercel deployment inventory.
- No code, production data, schema, auth, secrets, provider settings, billing, production deployment or branch refs were changed.
- Next: (1) resolve CFO currency minor-unit contract and FX representation; (2) get exact-head CI and Observer Validation for PR #25 without altering its source; (3) review PR #23 consent UI against account-specific provider activation and pre-inference downstream-chain attestation; (4) review PR #26/27 for server-side atomic persistence and pair confirmation; (5) continue native iOS feasibility only with a verified free macOS/Xcode path; (6) preserve PR #12 as integration candidate and production unchanged until release gates pass.

This handoff records completed validations and remaining blockers; it does not declare JARVIS production-ready or any unshipped capability complete.
