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
