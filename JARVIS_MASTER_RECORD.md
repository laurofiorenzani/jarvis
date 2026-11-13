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


## 2026-11-13 — FreeLLMAPI adapter and pt-BR correction

### Implementation commits on work/jarvis-freellmapi-cloud-gateway

- Added the FreeLLMAPI gateway provider kind to supabase/functions/jarvis-api/model-router.ts.
- Added routing-profile validation for auto, auto:fast, auto:smart, auto:reliable, fusion, and named auto:<profile> routes.
- Added the FreeLLMAPI task hint header X-FreeLLM-Task-Type with auto, chat, and code values.
- Added the separate JARVIS_MODEL_PROVIDERS_STANDARD pool. FreeLLMAPI is accepted only in that standard-privacy pool, with HTTPS and a server-side API key. It is not falsely labelled ZDR. Existing default pool behavior remains unchanged.
- Provider status now identifies FreeLLMAPI and the pool without exposing secrets. Main chat still uses the default pool; per-account acceptance and standard-pool selection remain to be implemented before user content can be routed through FreeLLMAPI.
- Added router unit tests for FreeLLMAPI model profiles and task headers.
- Corrected user-facing cloud API messages to Brazilian Portuguese and added regression tests.
- Commits: ae9d95bf316334026d74f911e7ba440a139a495b, 119bb48168977fce5f81d83d90182c925f11b036, 937b6b3fc637aaa8f131319368e5bff81ab4e222, 04c5ab75ab6848bf036f89b67292a5f3d7f03c68, 276d1373e2c935c9651eb28523ec8d27a14d9fcd.
- PR #13 remains open and Draft. CI #842 was still running at the time of this record update; do not treat the new commits as validated until a full exact-head run succeeds.

### Cloudflare and hosting refresh

- Cloudflare account inventory: zero Workers scripts. Workers AI catalog endpoint returned 75 models on page 1 (40 text-generation models); 9 text-generation entries explicitly require Workers Paid. Thirty-one entries lack that paid-only flag, but they are candidates only, not a fully verified free allowlist. The API reported 334 total models but page 2 onward returned no records in this connector call.
- Official Cloudflare Free-plan notice confirms Gemma 4 26B, GLM 4.7 Flash and Nemotron 3 120B as Free-plan-available models. The account's actual billing plan cannot be verified because Billing Read permission is absent. No Workers AI inference request was sent and no usage was consumed.
- Supabase Preview remains jarvis-preview-api v21; Production remains jarvis-api v32. No function deployment or secrets were changed.
- Vercel's latest READY deployment is still the documentation-only FreeLLMAPI branch commit a2c1248e5a193436e33fd4a8e3b63f27df731909. The adapter code commit has not yet been deployed to Vercel.
- No Oracle Cloud connector is available in this session; the historical VM remains unverified.
- No provider host, FreeLLMAPI unified key, provider credentials, or secure tunnel is configured. No user prompts or personal data were sent to a provider.
- No production resources, accounts, billing, secrets, branches or repositories were changed or deleted.

### Next work

1. Complete full CI on the latest PR #13 head.
2. Add per-account provider-consent storage and UI so the owner's account can enable the standard pool while the spouse's account remains off until her own acceptance.
3. Connect the standard pool to authenticated turns with safe fallback to the strict pool only before streaming begins.
4. Verify a persistent private host for the Node/SQLite FreeLLMAPI service; do not expose its dashboard or port 3001 publicly.
5. Deploy the updated Edge Function to Preview only, then test a synthetic prompt and controlled quota/error failover.
6. Add only provider credentials and models with verified zero-billing limits and eligible terms.


## 2026-11-13 — Per-account provider pools and consent

### Implemented on work/jarvis-freellmapi-cloud-gateway

- Added migration 20261113110000_jarvis_provider_preferences.sql. Provider pool preferences are per user, default off, RLS-enabled, and readable only by that authenticated user. Only the server-side Edge Function writes preferences.
- Added authenticated GET/PUT /v1/provider-preferences with a versioned policy acceptance, rate limits, bounded request bodies, and explicit revocation.
- Added two-user integration assertions: both accounts default off; enabling standard/ZDR pools for user A does not enable them for user B; user A can revoke both; user B remains unchanged.
- Added CloudAccess controls for each account to independently enable/revoke the strict-ZDR pool and standard multi-provider pool. The standard pool notice explains that FreeLLMAPI's downstream providers have different retention/training/region terms and that paid fallback is prohibited.
- Main authenticated turns use the standard pool only when that account enabled it. If it fails before streaming begins, JARVIS falls back to the default pool only when the same account also enabled that pool. Default pool entries are now accepted only when explicitly marked ZDR. FreeLLMAPI remains standard-only and cannot claim ZDR.
- Automatic memory extraction is restricted to the separately accepted ZDR pool; it never sends private conversation text to FreeLLMAPI or another standard-retention provider.
- Added multilingual task classification (pt-BR/English) for FreeLLMAPI routing and regression tests.
- Corrected cloud API error messages to Brazilian Portuguese, including a specific provider-consent instruction.
- New commits after the previous checkpoint: 49ccabea8bf63171a7fe412752475569a7bdacef (migration), 96a5c72a265be51cf9ac9b8cfb3492ba8e9f44e0 (strict default pool), 1a45cab711808f9ad8d525d34f4d60fc63259cd1 (provider API and turn routing), f144524e5cda462806358f888d9f5879bc51ef44 (contract), ed03a48618607f2dcacb681f75dde736f5db0095 (client), 45e7aece657662a3fc9cb234df27f256186760fc (client tests), a636e1b092d44a564e8121c47faa7464ea0ab348 (CloudAccess UI), cb26f2736fbf5d0b60bf6ce872bf4445094dfb98 (consent error handling), 7d27bd5062ed9d1bb23af801fddd02bfc8f6801b (two-user integration test), b6bb3c59c857499ff03aba99f59bcb8d3f1f6ffa (task classifier), a398229ee8f3c9132c41a61351006505c87511da (classifier tests), 4447f9aeb90a4213f1d8028d7aa61510d44a4369 (turn integration), 144b24bb80dc4ba391cbc5b4ff1f4545fea26ebd (pt-BR provider error), 6e1426baa4cac157c03316c496b88b8bad14103d (locale test), 028dff7c4aff45103f45952b0f9520cf6d48de3c (ZDR-only auto-memory extraction).

### Current validation and deployment state

- PR #13 remains OPEN/DRAFT, base work/jarvis-canonical-integration, current head 028dff7c4aff45103f45952b0f9520cf6d48de3c.
- CI run #853 was cancelled after new commits superseded its checkout. A new full CI run for the current head has not yet been confirmed; do not deploy until it passes.
- Supabase Preview remains jarvis-preview-api v21; Production remains jarvis-api v32. The provider-preferences migration and new Edge Function code have not been deployed to Supabase yet.
- Vercel's latest READY preview remains the earlier documentation-only commit a2c1248e5a193436e33fd4a8e3b63f27df731909. No Vercel deployment of the latest provider code is confirmed.
- FreeLLMAPI's private host, unified key and provider keys are still unconfigured. Cloudflare inventory has zero Workers scripts; Oracle VM state cannot be checked through a connected OCI tool.
- No provider inference request or personal prompt has been sent. No secret, production resource, account, billing plan, branch or repository was changed or deleted.

### Next actions

1. Obtain exact-head CI success for 028dff7c4aff45103f45952b0f9520cf6d48de3c; rerun if necessary.
2. Deploy the exact validated Edge Function source and migration to Supabase Preview only, preserving Production v32.
3. Verify the authenticated provider-preferences endpoints and two-account isolation on Preview.
4. Establish a persistent private Node/SQLite host for FreeLLMAPI. Oracle is not inspectable through current connectors; do not assume the VM is running.
5. Configure the FreeLLMAPI endpoint and unified API key only in server-side secrets, then run a synthetic non-personal inference and force controlled quota/fallback tests.
6. Verify provider-specific free caps and terms before enabling individual providers; no paid fallback or paid overage.


## 2026-11-13 — Multi-provider integration validation and connected-app refresh

### Exact code validation

- Code head validated: 637dbe5b02bd636b65bd3fcf3484a9d166b0b853 on branch work/jarvis-freellmapi-cloud-gateway.
- GitHub Actions CI run #861 (run ID 43408232534) completed SUCCESS on that exact code head. Successful stages: dependency audit, TypeScript/Vite production build, app tests, lint, provider privacy tests, semantic-memory validation, Supabase Edge Function typecheck, speech transcript tests, isolated Supabase startup, all migrations applied locally, SQL account-isolation tests, authenticated two-user semantic-memory/provider-preference integration tests, cleanup, production API/CORS smoke test and canonical preview CORS smoke test.
- The two-user integration test verifies both accounts default to no provider pools; user A can enable and revoke ZDR/standard pools; user B remains disabled throughout. Automatic memory extraction is guarded by that account's separate ZDR preference.
- A later documentation-only commit 47d6ae38b9d78531f8b66bc7c9ad67362a0fc1c7 updated the FreeLLMAPI catalog/API capability notes. It does not alter the code validated by CI #861.
- PR #13 remains OPEN/DRAFT, based on work/jarvis-canonical-integration. No merge to main has occurred.

### Vercel branch configuration and deployment limit

- Created branch-scoped Preview variables for work/jarvis-freellmapi-cloud-gateway: VITE_BACKEND=cloud, VITE_SUPABASE_URL, the public VITE_SUPABASE_ANON_KEY and VITE_SUPABASE_FUNCTION_NAME=jarvis-preview-api. All four are Preview-only and contain no service-role/provider secret.
- The latest READY Vercel deployment on this branch is still commit a636e1b092d44a564e8121c47faa7464ea0ab348. It was created before the branch-scoped environment variables were added, so it is not a valid configured end-to-end preview for the current branch.
- A new Preview deployment for code head 637dbe5 was attempted after setting the environment variables. Vercel rejected it with HTTP 402: free-tier API deployment limit exceeded (more than 100 deployments/day), retryAfter=86400. No billing upgrade or paid action was taken. The next Preview deployment must wait for quota reset.

### Supabase migration/deployment boundary

- Live migration inventory still contains 11 migrations through 20261112182639_jarvis_memory_auto_capture_opt_in. The new 20261113110000_jarvis_provider_preferences migration is not applied to the live project.
- Supabase Preview function remains jarvis-preview-api v21; Production remains jarvis-api v32. The new Edge Function code is not deployed. Because Preview and Production share the same Supabase Postgres project, applying the provider-preferences migration changes the shared production database schema even though the function deployment target is Preview. The migration is additive and creates a new RLS-protected table, but it must not be applied until the owner explicitly approves this schema change.
- No production function, production data, Auth accounts, passwords, secrets or billing settings were changed.

### Cloudflare and FreeLLMAPI status

- Cloudflare account read-only inventory shows zero Workers scripts. The Workers AI model catalog returned 75 records in the first page, including 40 text-generation entries; 9 explicitly require Workers Paid and must be excluded. Thirty-one text-generation entries lack that paid-only flag, but that is only a candidate set, not a verified free allowlist. The API reported 334 total records but later pages were not returned by the connected endpoint.
- Cloudflare's published Free-plan notice lists Gemma 4 26B, GLM 4.7 Flash and Nemotron 3 120B as Workers Free-available models. The actual Cloudflare account billing plan remains unverified because the connected OAuth permission lacks Billing Read. No Workers AI inference was sent and no usage was consumed.
- Official FreeLLMAPI README currently advertises 87 providers, 736 model families and 1,313 free endpoints. Free self-hosted installs use a monthly signed catalog snapshot; the live catalog is Premium ($19/year) and is not enabled. The upstream gateway supports OpenAI-compatible chat, Responses, completions, models, embeddings, image/video generation and audio speech/transcription; JARVIS currently integrates chat completions only.
- FreeLLMAPI is explicitly local-first, single-user and not multi-tenant; the official docs say not to expose it directly to the internet. Its SQLite database stores encrypted provider keys, and its API clients use one unified bearer key. JARVIS therefore needs a private host and authenticated ingress/proxy; the Windows machine cannot be the production host.
- The available connected tools do not include Oracle Cloud Infrastructure management. The previously mentioned Oracle VM state, SSH access and network configuration are unverified. No FreeLLMAPI host, tunnel, unified key or provider credentials are configured. No inference request or personal prompt has been sent.

### Current blockers and next actions

1. Obtain explicit approval to apply the additive provider-preferences migration to the shared Supabase database. Without it, the new provider-preferences API cannot be deployed to Preview because the table does not exist.
2. After approval, apply the migration, deploy the exact validated Edge Function source to jarvis-preview-api only, and verify authenticated preference endpoints plus two-account isolation. Keep Production jarvis-api v32 unchanged.
3. Wait for Vercel's free deployment quota reset, then create a Preview from the current branch head so the four branch-scoped environment variables are used.
4. Connect the existing Oracle VM or another genuinely free persistent host. Do not use Render/Railway free trials or ephemeral disks as a 24/7 SQLite gateway.
5. Install FreeLLMAPI privately, add a route-limited authenticated ingress, store the unified key and provider keys server-side, then test synthetic inference and controlled quota/fallback behavior.
6. Surface FreeLLMAPI's X-Routed-Via and X-Fallback-Attempts metadata in JARVIS diagnostics; then expand audio/vision/media integrations separately.

**Current truth:** provider router, per-account consent controls and isolation tests are implemented and CI-green on code head 637dbe5. The cloud gateway is not yet live because the shared-database migration, private persistent host and server-side secrets are not configured. No production deployment has been made.


## 2026-11-13 — Private FreeLLMAPI proxy and exact-head validation

### Private proxy package implemented

- Added `ops/freellmapi-gateway/proxy.mjs`, Dockerfile, Compose overlay, `.env.jarvis.example`, deployment README and `test/freellmapi-gateway-proxy.test.mjs`.
- The proxy exposes only `GET /v1/models` and `POST /v1/chat/completions`; dashboard/admin/MCP and all other routes return 404. It validates a separate 256-bit JARVIS bearer token, replaces it with the private FreeLLMAPI unified API key, forwards the task hint, streams responses and forwards safe routed-via/fallback headers.
- Limits: 2 MiB request body and 120 requests/minute per proxy instance. Logs contain method/route/status/duration/served-model/fallback-count only; never prompts, request bodies or credentials.
- The official FreeLLMAPI compose file publishes port 3001 to `127.0.0.1` by default. The deployment overlay leaves that host binding untouched; the proxy connects over the private Docker network. Optional Cloudflare Quick Tunnel exposes only the proxy. Its temporary hostname may change after a restart.
- Detailed deployment instructions are in `ops/freellmapi-gateway/README.md`. The existing Oracle VM is still unverified; the connected tools do not expose OCI account/instance/SSH management.

### Exact-head CI result

- Current code head `495549ade7c5777fca0f0dd5b0b5c38ec6f0eac7` passed GitHub Actions CI #871 (run ID `43409447032`): https://github.com/laurofiorenzani/jarvis/actions/runs/43409447032
- Successful checks: dependency audit, TypeScript/Vite production build, all Node tests including the new proxy tests, lint, provider privacy tests, semantic-memory/auto-capture tests, Supabase Edge Function typecheck, speech transcript tests, isolated local Supabase startup, all migrations applied, SQL account-isolation tests, authenticated two-user API integration (including provider preference isolation), teardown, production API/CORS smoke and canonical Preview CORS smoke.
- PR #13 remains OPEN/DRAFT on `work/jarvis-freellmapi-cloud-gateway`; no merge or production deployment.

### Connected infrastructure and blockers unchanged

- Vercel branch-scoped Preview variables are configured. The last READY Preview is older and predates those variables. New deployment attempts hit the free API deployment cap (100/day, retry after 24h); no paid upgrade.
- Supabase Preview remains `jarvis-preview-api` v21 and Production remains `jarvis-api` v32. The additive `jarvis_provider_preferences` migration is not applied to the live database. Preview and Production share the same Postgres project; explicit approval is required before applying this shared-schema change.
- Cloudflare account inventory shows zero Workers scripts; billing plan remains unverified. No Worker or Tunnel was created.
- No Oracle Cloud connector is available; VM state, public IP and SSH access are unverified. No FreeLLMAPI host, unified key, provider keys or JARVIS gateway token are configured.
- No provider inference, personal prompt, account change, production function change, billing change or secret update has occurred.

### Next action gates

1. Obtain explicit owner approval to apply the additive RLS-protected `jarvis_provider_preferences` table to the shared Supabase database.
2. After approval, apply the migration, deploy the exact Edge Function bundle to Preview only, and verify provider preference isolation against the two existing accounts. Keep Production `jarvis-api` v32 unchanged.
3. Wait for Vercel quota reset and create the configured Preview from the current branch.
4. Connect the existing Oracle VM or provide a secure one-time deployment path; install FreeLLMAPI and the private proxy using the deployment package. Do not send SSH private keys or provider keys in chat.
5. Configure server-side secrets and run synthetic inference plus controlled quota/fallback tests before enabling the standard pool.


## 2026-11-13 — connected-platform verification from ChatGPT session (12:30 UTC)

### Verified live state (read-only inspection)

- Canonical application repository confirmed: `laurofiorenzani/jarvis`. Private `jarvis-personal-cloud` remains a planning/workbench repository; it is not the executable application repo and must not be deleted.
- Current FreeLLMAPI gateway branch head is `d499419a1586586429b7265b953496868b5edb9e`. PR #13 remains open/draft. PR #12 remains open and is the broader amber/cloud-auth integration line. No PR was merged or modified during this inspection.
- Vercel project `jarvis` is readable. A READY Preview deployment exists at `jarvis-7g68mgue9-lauro-fiorenzani.vercel.app`, built from ancestor commit `9265f7c44de2630b48fdda5cee18f614a141e04b`. GitHub compare confirms this deployment commit is an ancestor of current gateway branch head `d499419` (six commits behind); it is not exact-head validation. Branch-scoped Preview variables for `work/jarvis-freellmapi-cloud-gateway` are present and target Preview only. No values are recorded here.
- Supabase project `undmhmdwhxvjgvezvucy` is `ACTIVE_HEALTHY`, region `eu-west-3`. Production `jarvis-api` is v32; Preview `jarvis-preview-api` is v21. Live migration inventory ends at `20261112182639_jarvis_memory_auto_capture_opt_in`; `20261113110000_jarvis_provider_preferences` is not applied.
- Live public-schema inventory: 13 conversations, 42 messages, 33 turns, 87 rate-limit rows, 0 approved personal-memory rows, 1 memory-preference row, and 0 rows in the semantic-memory summaries/topics/facts/topic-links tables. All listed tables have RLS enabled. These counts are a point-in-time snapshot, not a product readiness claim.
- The provider-preferences migration in PR #13 is additive and RLS-protected, but Preview and Production share the same Postgres database. Do not apply it without explicit owner approval; deploying Preview code alone cannot isolate the schema change.
- Supabase security advisor reports leaked-password protection disabled (WARN). It also reports RLS enabled/no policy for `jarvis_rate_limits`; direct table grants were checked and only `postgres` and `service_role` have privileges, with no `anon` or `authenticated` grant. This appears consistent with service-role-only rate-limit access; do not add a permissive policy. Password-protection configuration remains a separate Auth security decision and was not changed.
- Supabase performance advisor reports 18 unused indexes. Given low current row counts and new semantic-memory tables, do not remove indexes based on this snapshot.
- Cloudflare account is authenticated and account inventory returns one account. Workers Scripts inventory is empty (zero scripts). No Worker was created.
- No provider inference, personal prompt, secret readback, account change, production function deployment, migration, billing change, or external action was performed in this inspection.

### Updated immediate next actions

1. Obtain explicit owner approval before applying the additive provider-preferences migration to the shared Supabase database.
2. After approval, deploy the exact validated Edge Function to Preview only and test provider preference read/write and two-account isolation. Keep production `jarvis-api` v32 unchanged.
3. Create a fresh Vercel Preview from the current gateway branch head when deployment quota allows; do not treat the ancestor Preview as exact-head verification.
4. Verify or provision the existing persistent Oracle VM through an authorised OCI/SSH route; current connected tools do not expose OCI management, and Cloudflare has zero Worker scripts.
5. Configure the private FreeLLMAPI host/proxy and server-side secrets only after host verification; run synthetic inference and controlled quota/fallback tests before enabling any provider pool.
6. Address the Supabase leaked-password-protection warning through a separately approved Auth security change; do not change it silently.
