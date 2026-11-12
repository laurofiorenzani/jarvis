# JARVIS — handoff for the next ChatGPT conversation

Last updated: 2026-11-12 (UTC)
Repository: https://github.com/laurofiorenzani/jarvis
Active work branch: `work/jarvis-amber-production-track`
Main UI PR: https://github.com/laurofiorenzani/jarvis/pull/7 (draft; do not merge automatically)

## User instruction
Continue autonomously across independent workstreams wherever safe. User explicitly authorized broad development autonomy and memory work for their own account. The wife's account must remain independent and must not have memory enabled without her own consent. Preserve account isolation. Avoid irreversible production changes; additive reversible maintenance is allowed within the user's explicit autonomy instruction.

## Current verified state
- Latest UI PR #7 remains OPEN and DRAFT; base `main`. Do not merge automatically.
- Active branch head verified 2026-11-12: `56d8c1ea620624e565744aab3f8375c43048fc82` (PR #7; recheck before any write).
- GitHub Actions run `43278833174` completed SUCCESS for commit `fdf65c7e24399868a629a603a3daa326af1b7a91`: npm ci, TypeScript/Vite production build, tests, and lint all passed. This includes the SSE stream cancellation implementation and PR-triggered CI workflow.
- GitHub Actions run `43278949364` completed SUCCESS for commit `beab81377c6c34f1acfe94691f67402f9364b7bd`: npm ci, TypeScript/Vite production build, tests, and lint all passed.
- GitHub Actions run `43280101199` (run #61) completed SUCCESS for commit `c03a8ee148d455f6511442b1cc4bd3fef51d8b5c`: Node tests, lint, Deno typecheck, and Deno semantic-memory tests all passed.
- GitHub Actions run `43282871493` (run #165) completed SUCCESS for commit `3fb9d3d775265f311af3ecf88d07df85e37e4348`: npm lockfile resolution, `npm audit --audit-level=high`, TypeScript/Vite production build, all Node tests (including the Kokoro runtime-import smoke test), lint, production and preview Edge Function typechecks, and Deno semantic-memory tests all passed. The validated lockfile artifact was committed exactly as `package-lock.json` in commit `f4a9037f0745585c18a8d710a2d802a441327b92`; its Git blob SHA matches the validated artifact. The lockfile now resolves `@huggingface/transformers@4.3.2` and `sharp@0.35.5`. The high-severity audit threshold passes; the previous three high findings in the optional Kokoro dependency chain are resolved. The Kokoro import smoke test passed with the upgraded Transformers.js runtime.
- GitHub Actions run `43283395058` (run #184) completed SUCCESS for commit `47afc259cd6129c236421f684286c51ae16f253f`: the resolved lockfile passed `npm audit` with `found 0 vulnerabilities`, TypeScript/Vite build, all Node tests, lint, both Edge Function typechecks, and both Deno test suites. The lockfile from the validated artifact was then persisted as commit `f4a9037f0745585c18a8d710a2d802a441327b92`. A follow-up CI run on that bot-created commit is marked `action_required` with no jobs; the exact same source/dependency tree has passed runs #165 and #184. Before merge or production promotion, rerun/confirm CI on the exact head. The frontend treats `autoCaptureEnabled` as an optional API capability so an older backend cannot receive unsupported preference writes.
- GitHub Actions run `43283685919` (run #187) completed SUCCESS for the current head `f722cd01c16d82bfafcb75f5985f816bc3eaa4fb`: dependency audit, production build, Node tests, lint, both Edge Function typechecks, and both Deno test suites passed. The `JARVIS CI` commit status is SUCCESS on this exact head.
- Supabase project `Jarvis` (`undmhmdwhxvjgvezvucy`, eu-west-3) is ACTIVE_HEALTHY.
- Production `jarvis-api` Edge Function is ACTIVE, version 32, `verify_jwt=false`; the handler itself manually validates every bearer token using Supabase Auth before all authenticated routes. Health and OPTIONS are handled separately.
- The active Supabase database has RLS enabled on all JARVIS application tables. The rate-limit table intentionally has no client RLS policy; only server/service-role code should access it.
- Memory preference audit: exactly one preference row exists and `context_enabled=true`. This is the user's own previously opted-in account; do not enable the wife's account. There are currently zero rows in `jarvis_memories` and `jarvis_memory_facts`; therefore retrieval is enabled but there are no saved personal facts yet.
- Automatic memory candidate extraction is implemented for cloud turns. `jarvis-preview-api` is ACTIVE at version 10; all four deployed files (`index.ts`, `model-router.ts`, `semantic-memory.ts`, `deno.json`) were byte-for-byte compared with the active branch and match. Production `jarvis-api` is ACTIVE at version 32; the deployed auto-capture handler was read back from Supabase. The database audit shows one preference row with retrieval enabled and `auto_capture_enabled=true` for the user's previously opted-in account; the wife's account remains separate and not enabled. There are currently zero semantic facts, pending candidates, summaries, or topic links. Extraction creates provenance-linked PENDING candidates only, skips sensitive source turns and candidate content (including health, financial, identity, contact, address, date-of-birth, immigration, and family details), deduplicates against pending/approved facts, and is limited to 5 extraction calls per user per hour. It never auto-approves. The branch-specific Vercel frontend is still behind the current branch, so the new control/UI has not yet been verified in a live browser.
- The cloud test console is not yet the main voice/chat brain. Existing bridge backend provides MCP tools, camera capture, UI events, and device integrations; do not replace it with cloud text streaming until a tool-calling hybrid adapter has parity and fallback tests.
- Vercel's latest observed READY preview is `jarvis-8124wkhx8-lauro-fiorenzani.vercel.app`, commit `f4d2c7765e366eae5a3a6b4bf77504b93fb18906`. It is behind the current branch head. A manual deployment attempt for the current branch was also blocked by `api-deployments-free-per-day` with a 24-hour retry window. Do not repeatedly retry or change billing. The Vercel Preview environment variable `VITE_SUPABASE_FUNCTION_NAME` is set to `jarvis-preview-api` for this branch. The branch Preview environment has the required Supabase URL and anon key; there are no production-target Supabase environment variables, so the production PWA is not yet wired to the cloud API. Do not add production env values until the preview UI and account isolation are validated.
- No authenticated end-to-end memory workflow has yet been verified in a live browser with both household accounts.
- Semantic memory retrieval currently uses PostgreSQL full-text search, not vector embeddings.
- Supabase security advisor reported leaked-password protection disabled (WARN). No tool is available here to change this Auth setting; document and direct the owner to Supabase Auth settings when required. The RLS-no-policy INFO on `jarvis_rate_limits` is intentional service-role-only isolation.
- Dependency audit: the validated lockfile now pins the Kokoro dependency chain to `@huggingface/transformers@4.3.2` and `sharp@0.35.5` using npm overrides. Both npm audit output and `npm audit --audit-level=high` report `found 0 vulnerabilities`; the Kokoro module import smoke test passes. The optional Kokoro voice engine was preserved rather than removed. The exact validated lockfile artifact is committed.
- `cloud-auth.ts` now scopes concurrent refresh requests by account/revision and listens for cross-tab `storage` events, so household account changes invalidate stale in-flight auth work. This code is in the active branch; keep account-isolation regression checks in the release gate.\n- PRs #4, #5, and #7 remain draft/unmerged; do not merge without explicit approval.

## Latest code and infrastructure work
- Refactored SSE frame splitting into `src/lib/sse-frames.js`, with TypeScript declarations in `src/lib/sse-frames.d.ts`.
- Added `docs/architecture/hybrid-brain.md` as a design-only plan for a safe cloud-reasoning/local-bridge hybrid. It explicitly preserves MCP tools, camera, UI events, panels/blades, cancellation, account isolation, and the bridge's default-deny action gate; no hybrid runtime code has been enabled.
- Cloud STT telemetry showed repeated HTTP 429 responses from the preview transcription provider. `src/lib/voice.ts` now falls back to browser-native SpeechRecognition on 429/503 or network failure, clears queued cloud audio, stops the VAD pipeline, and prevents further cloud STT attempts for that session. Validate in Chrome/Edge and iOS Safari after the latest frontend preview deploy.
- `src/lib/cloud-api.ts` now consumes streamed frames with LF/CRLF support, chunk-boundary buffering, multiline data fields, final-frame flushing, and correct reader cancellation.
- Added seven Node built-in tests in `src/lib/sse-frames.test.mjs`: multiple frames, chunk boundaries, CRLF, final frame, malformed JSON boundary, AbortSignal cancellation, and reader cancellation after callback/parser failure.
- Added branch-push and `pull_request` triggers (opened, synchronize, reopened, ready_for_review) in `.github/workflows/jarvis-preview-validation.yml`. The workflow now includes Deno typecheck/tests for the Edge Function and publishes a `JARVIS CI` commit status. Confirm the status on the newest commit; the workflow file is still only on the feature branch until PR merge.
- Supabase performance advisor found eight unindexed semantic-memory foreign keys. Added and applied the additive, reversible migration `20261112182117_jarvis_memory_foreign_key_indexes`; all eight indexes were verified present. The advisor no longer reports unindexed foreign keys; remaining INFO findings are unused indexes (expected while these tables are new/empty).
- The migration is tracked in GitHub at `supabase/migrations/20261112182117_jarvis_memory_foreign_key_indexes.sql`, matching the applied Supabase migration version.
- Static review of `CloudMemoryPanel.tsx` and `cloud-auth.ts` found identity-generation guards around account-scoped async UI updates and revision checks around delayed sign-in/refresh/sign-out. Sign-out now catches remote revocation failures and reports that local sign-out has completed rather than producing an unhandled rejection. This is not a substitute for two-account browser E2E.
- Copied the deployed production Edge Function source into `supabase/functions/jarvis-api/` (`index.ts`, `model-router.ts`, `semantic-memory.ts`, `deno.json`) so backend changes are version-controlled. The preview `jarvis-preview-api` is deployed with the branch's auto-capture code; production `jarvis-api` is version 32 and has not been replaced.
- Static review of the branch Edge Function confirmed that conversation lookup, message history, cancellation, candidate listing/decisions, and approved-memory retrieval filter by the authenticated `userId`; candidate inserts derive `user_id` from the validated bearer token, never from browser input. Production Edge Function is version 32 and includes the automatic-capture changes.
- Edge Function CORS explicitly allows the branch preview alias and local development; allow headers match the frontend client (`apikey`, `authorization`, `content-type`, `x-jarvis-api-version`). A fresh Vercel deployment for the latest tested branch commit could not be created because the Vercel API reached its free-tier daily limit (`api-deployments-free-per-day`, retry after 24 hours). The latest Vercel build error seen belongs to older commit `892fe2c`, before the passing CI/lockfile fixes; it is not evidence that the newest commit fails to build.
- Local git clone could not run because this execution environment cannot resolve github.com. Use GitHub Actions as the authoritative build/test environment.

## Next work — prioritize parallel, low-risk tasks
1. Confirm GitHub Actions run #159 for the newest branch head; run #150 passed build, tests, lint, both Deno typechecks and both Deno test suites, and committed the tested lockfile.
2. Confirm `JARVIS CI` status on the newest branch head after run #159 completes; fix any failures before deployment.
4. Continue account-switch tests for overlapping refresh/sign-in/sign-out, and add tests for CloudMemoryPanel stale async responses.
5. Verify Edge Function CORS/preflight and route contracts from the exact READY preview origin once Vercel quota permits.
6. Add authenticated integration tests for two distinct users: account A cannot read, approve, reject, search, or delete account B data.
7. Once Vercel's daily deployment quota resets, deploy the latest passing branch commit and verify the browser preflight, auth, account-specific memory settings and iPhone UI. Do not confuse a successful Supabase function deployment with a successful Vercel frontend deployment.
8. Design (do not blindly switch) a hybrid main-brain adapter preserving bridge MCP tools, camera capture, UI push events, panels/blades, cancellation, and error recovery.
9. Continue BMW, Blink, Dreame, lighting, communications, and Family CFO adapters only after secure foundations and real credentials/consent are available.
10. Keep the PR draft; do not merge it until all release gates are met and the user explicitly asks to merge.

## Safety / release rules
- Never put secrets, access tokens, passwords, or personal records in GitHub issues, commits, or ChatGPT messages.
- Never enable memory for the wife's account without her own consent; never merge household accounts.
- Automatic memory may only create pending, provenance-linked, non-sensitive candidates after the relevant account explicitly opts in. Never auto-approve.
- Never merge draft PRs or alter production auth settings, provider secrets, or irreversible personal data without explicit approval.
- Label simulated, visual-only, unverified, and connected states accurately.


## Verified continuation update — 2026-11-12 19:05 UTC
- Rechecked PR #7: OPEN, DRAFT, mergeable, 177 commits, 39 changed files; head is `56d8c1ea620624e565744aab3f8375c43048fc82`. Keep draft; do not merge without explicit approval.
- GitHub Actions run #198 (`43284312357`) on that exact head completed SUCCESS. Confirmed all steps passed: npm install/audit, TypeScript + Vite production build, Node regression tests, lint, production and preview Deno typechecks, and both Deno semantic-memory test suites.
- Supabase project `undmhmdwhxvjgvezvucy` is still ACTIVE_HEALTHY. `jarvis-api` is ACTIVE v32 and `jarvis-preview-api` ACTIVE v10.
- Live schema inspection confirms RLS enabled on all listed JARVIS tables. Cloud data currently exists (13 conversations, 42 messages, 33 turns); the memory preference table has one row; semantic memories/facts/summaries/topics/links remain empty. Do not assume that memory retrieval being enabled means facts have already been saved.
- Latest security advisor: leaked-password protection remains WARN and needs owner action in Supabase Auth settings. `jarvis_rate_limits` has RLS enabled with no client policy; this is intentional service-role-only access, not a missing public policy.
- Performance advisor currently reports 18 unused indexes. Do not drop them while tables are new/low-volume; reassess after representative traffic.
- Vercel daily deployment quota remains a blocker. Do not repeatedly retry deployments or change billing. Keep using GitHub Actions for build/test validation until quota resets.
- No live browser/iPhone end-to-end test has been completed by this check. Passing CI is not proof that camera, voice, sign-in, memory UI, or device actions work end-to-end.

## Product contract — preserve across sessions
- JARVIS is an autonomous personal agent, not merely a chatbot, UI demo, or collection of disconnected integrations.
- No Shortcuts dependency or Shortcut-based activation requirement. The target is direct, consistent access from computer, phone, browser, and supported in-car surfaces, with shared cloud identity/context and local capability adapters where required.
- Persona must feel natural and consistent: varied contextual greetings, humour, familiar forms of address chosen from user-approved style (e.g. “mestre”, “chefão”, “meu chapa”, “El Chapo Fiorenzani”), and conversational continuity. Avoid repeating one fixed greeting on every turn.
- The agent should understand outcomes, plan the steps, choose tools, and execute routine/pre-authorized reversible actions without asking at every step. Ask for one-click approval only for critical/high-impact actions (financial transactions, sending externally, destructive changes, security/account changes, production releases, or other configured sensitive actions).
- Multimodal vision: camera/image understanding, object/product identification with uncertainty and research when needed, scene interpretation, and context-aware follow-up.
- Personal communications: summarize incoming WhatsApp/email/notifications, prioritize people and urgency, draft contextual replies in the user's style, and request approval before sending unless a narrowly scoped sending rule has been explicitly configured.
- Family CFO must be able to reconcile financial data, spot spending changes, propose cash allocation (emergency reserve, credit cards, mortgage overpayments, investments), prepare transactions, and request explicit approval before moving money or placing trades. IBKR execution must use supported authenticated integrations and a clear approval record; never automate around provider security controls.
- Smart-home/car/device integrations must expose real provider-backed status and actions, not visual placeholders. Examples include Wi-Fi lights, Blink cameras, Dreame, BMW/My BMW, navigation context, and supported CarPlay capabilities.
- Self-evolution is a core requirement: system observer, proactive improvement planner, development agent, isolated branches/sandbox, tests/security checks, guarded release and post-deploy monitoring. JARVIS may autonomously investigate and prepare reversible changes; production promotion, credential changes, destructive operations, and other critical actions remain gated by explicit approval.
- The first release goal is a genuinely usable daily V1, not completion of every future integration. After V1 is in real use, continue improvements with JARVIS participating in its own development. Do not hold V1 hostage to the entire long-term roadmap.
- Keep household accounts strictly isolated. The wife's account must not inherit the user's memories or preferences; her own opt-in and consent are required.

## Next execution priorities after the successful run #198
1. Inspect exact branch-head CI status and keep a green baseline before code changes.
2. Continue the hybrid brain implementation plan without replacing the existing local bridge/MCP/camera/UI event plane; implement only behind tests and a rollback path.
3. Build the missing one-click approval/action-intent lifecycle as a typed, auditable contract; no arbitrary model-authored code or raw shell execution.
4. Add and test natural persona/greeting policy with contextual variation, without hardcoding repetitive salutations into every turn.
5. Continue cross-account and stale-request tests for auth, memory UI, conversations, and turn cancellation.
6. Prioritize V1 daily-use end-to-end validation (desktop + iPhone browser/PWA, voice, sign-in, conversation persistence, camera permissions, cloud/bridge fallback).
7. Build provider-backed device and communication adapters only when the connector/API/auth path is verified; show unavailable rather than simulate connected.
8. Implement Family CFO read/analysis first, then draft allocations and one-click approved execution via supported financial provider APIs.
9. Design and implement self-evolution in isolated development environments with tests, reviewable diffs, approval-gated production release, and rollback.
10. Keep PR #7 draft and do not merge or promote production without explicit user approval.


## Latest work completed — 2026-11-12
- Added user-aligned persona guidance to the default local bridge system prompt: warm/familiar conversational style, contextual variation, occasional user-approved nicknames ("El Chapo Fiorenzani", "chefão", "mestre", "meu chapa"), language matching, and a serious register for consequential matters. Removed the conflicting instruction that the user must never be addressed by name and the forced British-butler register.
- Updated wake-word acknowledgements to vary across familiar Portuguese greetings instead of only "sir" variants. The browser-direct system prompt was aligned too.
- Code commits: `c87e84d7443a30e2ead86cc78bb2f3711e36119f`, `19dd74ef43bd6b9a6e85cf682e51feeeb35bb1fb`, `d1d7cd3995d8cb4c790857c21e114b42b7e5f264`, and `6071775245c8629e2204f71a4b98982dc8e504bc`.
- GitHub Actions run #208 (`43286388314`) passed on code head `6071775245c8629e2204f71a4b98982dc8e504bc`: dependency installation, high-severity npm audit, TypeScript/Vite production build, Node regression tests, lint, production and preview Deno typechecks, and both Deno semantic-memory test suites.
- A Vercel preview deployment was attempted for that validated head but the account still returns `api-deployments-free-per-day` (HTTP 402, retry after 24 hours). No billing or plan changes were made. The latest READY preview remains behind this code head; do not claim the persona changes are live until a deployment and browser test succeed.
- The new one-click critical-action approval lifecycle is still not implemented. Current bridge policy is primarily a global read-only / `--writes` gate; do not describe it as the intended per-action approval UX. This is a major V1 gap and must be designed/tested before enabling autonomous effectful actions.


## Action approval design contract — 2026-11-12
- Added `docs/architecture/action-approval-lifecycle.md` as the normative design for per-action approvals.
- It defines risk classes, a nonce/session/toolUseId/argument-digest-bound approval envelope, fail-closed behavior, account isolation, accessible desktop/iPhone UI requirements, audit redaction, and unit/integration/E2E release gates.
- This is a design document only. The current bridge still uses the global `JARVIS_ALLOW_WRITES=1` / `--writes` gate. Do not claim per-action approvals are implemented or enable broad writes before the full lifecycle is tested.


## Action-risk classifier groundwork — 2026-11-12
- Added `bridge/action-risk.mjs`, a pure conservative classifier for read, routine, approval-required, and deny risk outcomes.
- Added `tests/action-risk.test.mjs` covering built-in reads, MCP read verbs, effectful verbs, unknown tools, malformed/prohibited names, and the explicit pre-authorisation signal.
- Commits: `9a585e8be56888b0c184fbb61b0dee4d881fa63d` and `a19683c2f99cc3893d6e2f0a85c14db18dacd8a7`.
- This is groundwork only: it is not wired into `PreToolUse`, does not create or resolve approval requests, and does not enable writes. Existing bridge policy remains authoritative. Do not treat the pre-authorisation hook as production-ready until a trusted rule store, owner/session binding, scope validation, expiry and revocation are implemented.
- Next: run CI on the updated branch; then implement canonical argument hashing and a single-use expiring pending-approval registry with disconnect/timeout cleanup before adding any UI or protocol path.


## Approval lifecycle implementation groundwork — 2026-11-12 (continued)
- Hardened `bridge/action-risk.mjs`: routine/pre-authorisation cannot be asserted through classifier input; only an explicitly named builtin (not an MCP tool impersonating that name) receives builtin read classification. Unknown/effectful tools remain approval-required.
- Added `bridge/action-approval.mjs`: deterministic recursive JSON canonicalisation and SHA-256 argument digest; rejects non-JSON values, cycles, class instances and dangerous object keys.
- Added `bridge/pending-approvals.mjs`: in-memory one-shot approval registry bound to session ID, tool-use ID and exact argument digest; enforces bounded TTL (max 120 seconds), rejects replay/mismatch, and denies on timeout, session cancellation or registry close.
- Added unit tests for digest stability/tampering, malformed arguments, MCP impersonation, single-use approval, mismatch, rejection, expiry and cleanup.
- Commits include `d49a88c`, `e02a498`, `97f037c`, `61090ac`, `405d8db`, `0f6f3d2`, `faa2ae3`, `e0a4217`, and `413ea8f`.
- Important limitation: these modules are still not wired into the bridge's `PreToolUse` hook or WebSocket/HUD protocol. The current global read-only/--writes policy remains the only live enforcement. Do not describe action approvals as implemented or enable broad writes.
- Next: validate the new modules in GitHub Actions; then implement bridge-side ownership and WebSocket decision handling, disconnect cleanup, and a visible accessible approval card. Verify actual SDK hook behavior before allowing the tool call to proceed.


## Approval primitive hardening — 2026-11-12 (continued)
- Hardened canonical argument serialization to reject getters/accessors (without invoking them), symbol keys, non-enumerable/hidden properties, sparse arrays and arrays with extra properties, in addition to cycles, non-finite numbers, class instances and dangerous object keys.
- Hardened the pending registry with a 32-request cap, bounded identifiers, duplicate session/tool-use invocation rejection and strict decision-envelope fields.
- Added regression tests for these cases.
- These remain isolated, unintegrated primitives. They do not pause the Claude Agent SDK hook, do not establish authenticated account ownership, and do not create a usable UI approval flow. The current global write gate remains authoritative; do not enable broad writes.
- Latest commits: `d634fdb`, `80f07c7`, `04728c0`, `8359dd8`.
- CI run observed for earlier head `f9ef2d5` (run #238) passed dependency install, high-severity audit and TypeScript/Vite build; unit/regression tests were still running at last inspection. Newer commits were pushed after that run, so a successful CI result for the current head is still required.


## Follow-up validation and classifier correction — 2026-11-12
- Inspected failed Actions run #246 (commit before latest hardening). Build and TypeScript/Vite passed; 45 of 46 executed Node tests passed. The failing regression exposed an overly broad read-verb match: an MCP tool named exactly `Read` was incorrectly treated as read-only.
- Tightened MCP read classification to require an explicit verb-plus-underscore prefix (for example `get_event`, `list_messages`). Trusted SDK built-ins remain explicitly allowlisted by exact name; ambiguous MCP names now fail closed to approval-required.
- Further hardened canonical approval digesting: arrays now reject non-enumerable/hidden elements as well as holes and extra properties.
- Added regression tests for hidden array elements. Current branch head is newer than run #246; fresh CI confirmation is still pending.
- No production or preview deployment was made. Vercel continues to reject deployments due to the account's free-plan daily deployment quota. The last known READY preview is behind current source.


## Supabase security review — 2026-11-12
- Rechecked both Edge Functions: `jarvis-api` v32 and `jarvis-preview-api` v10 are ACTIVE. The function has `verify_jwt=false`, but the handler explicitly requires a Bearer token and validates it with `auth.getUser(token)` before creating a user-scoped service-role client. This is intentional custom auth validation; preserve it and regression-test it.
- Confirmed public tables have RLS enabled. Policies scope conversations/messages/turns and memory records/preferences by `auth.uid()`; memory tables expose authenticated SELECT only. The rate-limit table intentionally has RLS enabled with no client policies.
- Audited `jarvis_consume_rate_limit`: SECURITY DEFINER, fixed `search_path=public`, validates basic inputs, and EXECUTE is granted only to postgres and service_role (not anon/authenticated). No database changes made.
- Security advisor findings: leaked-password protection remains disabled (owner action in Supabase Auth settings); one informational RLS/no-policy finding for the service-only rate-limit table. Performance advisor reports 18 unused indexes; leave them in place until real workload data justifies removal.
- The account's current memory preference row has context and automatic candidate capture enabled. Automatic extraction still creates pending candidates, not approved memory; keep approval and user isolation requirements.
- Current Actions run #253 is validating the latest head after the classifier and canonicalization fixes. Vercel preview deployments remain blocked by the free daily deployment quota.


## Browser speech locale correction — 2026-11-12
- User confirmed the hosted 3D interface loads and voice transcription captures speech on iPhone, but the assistant turn fails and recognition is English-only.
- Inspected `src/lib/voice.ts`: browser SpeechRecognition was hard-coded to `en-GB`.
- Created isolated branch `work/jarvis-voice-locale` from the validated mainline head; changed the recognizer to use `SPEECH_LOCALE` from config, default `pt-BR`, with `en-GB` and `en-US` alternatives. Added `VITE_SPEECH_LOCALE` documentation to `.env.example`.
- This fixes the default browser recognizer locale in source; it does not provide simultaneous language auto-detection, nor does it fix the hosted cloud-brain routing failure. Browser SpeechRecognition accepts one locale per recognizer.
- The branch is isolated from PR #7. CI/build validation and a draft PR are still pending.
- User's iPhone visual smoke test passed for page load and 3D interaction. The user observed transcript capture but no spoken/text model answer; this is consistent with hosted deployment still using the bridge backend without a reachable local bridge. Do not call E2E voice/cloud integration passed.
