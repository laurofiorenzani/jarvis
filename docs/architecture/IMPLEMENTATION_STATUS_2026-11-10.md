# JARVIS implementation status — 2026-11-10

This note records what is present in the integration branch and separates code-level evidence from deployment and runtime claims.

## Confirmed in the repository

- The production default backend is now `cloud`. `VITE_BACKEND=bridge` explicitly opts into the local developer bridge; `VITE_BACKEND=direct` remains a local-only demo mode.
- The app contains an explicit Cloud Access panel. A successful Supabase password sign-in creates the cloud runtime and selects the cloud brain for the current page session. Fresh sessions open the sign-in panel by default; previously opted-in tab sessions are automatically restored after reload. Signing out clears the tab-session choice and returns to the configured backend (cloud requires a new sign-in). The UI currently supports sign-in only; account creation and password recovery are not implemented, so an authorised Supabase Auth user must already exist.
- Cloud authentication uses an injected token store. The browser offers two explicit choices: volatile tokens (sign in again after reload) or an opt-in `sessionStorage` token store scoped to the current tab (restorable after reload in that tab; cleared when the tab session ends). This is not persistent login across browser restarts or devices.
- The cloud API client supports authenticated conversation creation, listing, retrieval and deletion, plus streamed turns and cancellation.
- The cloud brain creates conversations lazily and exposes an explicit `resumeConversation(id)` operation. The Cloud Access panel lists saved conversations, refreshes the list, and lets the user explicitly resume one or start a new conversation. After a page reload, the user must first sign in or restore the tab session, then explicitly choose a conversation; no conversation is silently activated.
- The cloud memory panel supports explicit manual save, list, deletion and an opt-in setting for including approved memories in model context. It is not the same subsystem as the local encrypted-memory bridge.
- The local FreeLLMAPI smoke test targets a loopback endpoint (default `http://127.0.0.1:3001`) and refuses non-loopback endpoints before sending its API key. This validates a local adapter only; it does not prove that the cloud model router is configured or that a live provider call succeeds.
- The cloud provider-status panel reports whether provider configuration is declared and which model names are configured. This is not a live inference test and must not be presented as proof that a provider is reachable or that free-tier quotas are available.
- Cloud mode uses browser-native speech recognition and speech synthesis. The ElevenLabs proxy remains a local-bridge feature; server-side cloud TTS/STT is not yet integrated. No provider key is read into the cloud browser config.
- The encrypted local memory runtime remains disabled by default. Its CI checks do not complete the target-PC, backup/recovery, retention, ACL and production rollout gates documented in `docs/security/MEMORY_INTEGRATION.md`.

## CI evidence

Historical baseline only: GitHub Actions run [42704074425](https://github.com/laurofiorenzani/jarvis/actions/runs/42704074425) completed successfully on commit `56316718f52f5dde16e4c311ada5a10b1e7055b1`: dependency installation, TypeScript/Vite production build, tests, lint and Supabase Edge Function type-check passed. This predates the cloud-default and auto-restore changes.

The companion cross-platform test run [42704073993](https://github.com/laurofiorenzani/jarvis/actions/runs/42704073993) completed successfully on Ubuntu and Windows for the same historical baseline. It is not validation of the latest branch head.

These are repository CI results for an earlier commit only. After the documentation commits through `b87bd29ee2cea3d15b14a159dc38225fa76643b1`, GitHub's commit-check endpoint returned zero check runs and the combined commit status was `pending` with zero status contexts. The workflow-runs listing still showed only the historical `56316718f52f5dde16e4c311ada5a10b1e7055b1` runs. Therefore current-head CI is **not verified**; do not mark the branch validated. These older runs also do not establish successful sign-in from the user's device, live model inference, iOS Keychain integration, or production readiness.

## Recovered product decisions and continuity

- The canonical decision ledger is `docs/PROJECT_DECISIONS.md`; read it before changing project scope or repeating discovery work.
- Product priority confirmed by the user on 2026-11-10: finish and stabilise the JARVIS core before starting BMW, Blink, Dreame, or other vendor integrations.
- The later integration target is direct JARVIS-to-service communication through internal adapters and authorised APIs/protocols. Apple Shortcuts, Quick View hand-offs, and workflows that require the user to operate vendor apps are not the target architecture; vendor apps may be needed only for initial authorisation/MFA or fallback.
- The current cloud model router streams text only. A tool-call loop, generic cloud tool registry, and native iPhone action channel are not implemented.
- These decisions are recorded in source control only. They have not yet been seeded/retrieved as project memory by the running cloud assistant; do not claim runtime recall is fixed until that is implemented and tested.

## Next safe engineering steps

1. Run the current branch CI against the latest commit; historical green runs do not validate the current HEAD.
2. Confirm a live authenticated model inference with a controlled low-token turn, only after confirming server-side provider secrets and free-quota policy. The provider-status endpoint only reports declared configuration, not successful inference.
3. Validate cloud voice input/output, reconnects, conversation history, cancellation, and error states in a real browser session.
4. Close the account-access gap: configure an authorised Supabase Auth account and production origin allowlist; the UI currently has no account-creation or password-reset flow.
5. Build the standalone iPhone app only after the cloud core passes its release checks: add Capacitor/native iOS project on macOS/Xcode, Keychain and native audio adapters, app icon/splash, and physical-device testing. A Safari/PWA shortcut is not the final deliverable.
6. Keep production secrets, paid resources, network exposure, and personal-data migration behind separate explicit approval. Vendor integrations remain out of scope until the core is stable.

## Safety boundaries

- Do not merge the open memory pull request into `main` as part of this work.
- The deployed `jarvis-api` Edge Function is active at version 9 and its `index.ts`, `model-router.ts`, and `deno.json` were compared byte-for-byte with this branch; no redeployment is needed for the current API code. Do not change production secrets, create paid resources, change network exposure, or migrate personal data without a separate critical approval.
- Keep local encrypted memory disabled until all release gates pass.


## Conversation recovery implementation added

- The Cloud Brain now exposes an explicit `resumeConversation(id)` operation. It fetches the conversation through the authenticated API, validates that the returned ID matches the requested ID, and only then switches the active conversation.
- The Cloud Access panel now loads the user's conversation summaries after sign-in, supports manual refresh, displays saved conversations, and offers explicit resume and new-conversation actions.
- Resuming a conversation restores its persisted user/assistant messages into the HUD transcript and sets the Cloud Brain to continue using that same server-side conversation ID.
- A restore operation temporarily locks the Cloud Brain against concurrent turns, preventing a voice turn from racing a conversation switch.
- Added regression coverage for successful resume, failed history retrieval (which must not switch the active conversation), and concurrent-turn prevention during restore.
- The default browser token store remains volatile. A user may explicitly opt into tab-scoped `sessionStorage`; that session is now automatically restored after a page reload in the same tab. It is not persistent across browser restarts or devices.

The conversation-history and resume implementation is present on `work/memory-integration-ready`. Treat the earlier successful CI runs above as historical evidence only; they predate this implementation. The CI workflow is configured for pushes to `work/**` and pull requests. The available commit-run lookup only returns pull-request-triggered runs, so an empty result from that lookup does not prove that no push-triggered run exists. The latest branch head must be checked directly in GitHub Actions before it can be marked validated. The GitHub connector could read workflow runs and commit checks but did not expose a workflow-dispatch action in this session.


## 10 November 2026 — Cloud-build credential isolation

A review of `src/config.ts` found that optional remote MCP URLs and bearer tokens
were read from `VITE_*` variables regardless of the selected backend. Although
the cloud brain did not use these values, a cloud build could still have carried
demo-only integration configuration into its client bundle.

The configuration now reads Zapier, Pipedream, Notion, Linear, GitHub, Stripe,
Sentry, and Home Assistant MCP settings only when `VITE_BACKEND=direct`.
The default cloud-mode test also asserts that `activeServers()` is empty.

This is a source-level guard and regression test, not a completed production
bundle audit. Current-head CI still needs to run; no claim is made that a
production artifact has been inspected or that any previously deployed bundle
has been purged. Rotate any credential that may already have been exposed in a
public client bundle.


## Repository reconciliation checkpoint — 10 November 2026

The cloud-first application implementation remains on `laurofiorenzani/jarvis`, branch `work/memory-integration-ready` (the source branch of PR #1). The private `laurofiorenzani/jarvis-personal-cloud` repository is the project requirements/security workbench and contains a separate encrypted-memory/Cloudflare prototype on `work/intelligent-memory-next`. These are separate implementations, not a single shared codebase.

Do not merge the Cloudflare prototype into this Supabase application without an explicit architecture decision. The current application branch uses Supabase for cloud auth, conversations and memory. The isolated private prototype uses a different Cloudflare Worker/D1 design and has a different key/identity boundary.

This checkpoint does not change the release gates above: current-head CI, authenticated live inference, account recovery/access, native iOS implementation/device validation, cloud voice proxy, and direct vendor adapters remain unverified or incomplete. No vendor integration should be described as implemented until JARVIS can invoke it directly and a device-confirmed result is observed.


## 10 November 2026 — resumed FreeLLMAPI / cloud-core checkpoint

### Live repository and Supabase state rechecked

- Re-read the canonical decision ledger before further work. It explicitly selects the Supabase Edge Function router with direct HTTPS free-tier providers for the zero-cost two-user cloud prototype. FreeLLMAPI remains local-only unless a persistent, free, private host and proper multi-user isolation are proven. The single-user FreeLLMAPI dashboard/API must not be exposed as a public multi-user service.
- The active Supabase `jarvis-api` function is currently version 29 (ACTIVE, `verify_jwt=false`; the handler performs its own Supabase user-token validation). This supersedes the stale version-9 statement earlier in this file. Do not deploy over it without an actual code change and review.
- The checked-in cloud model router is still text-only and accepts OpenAI-compatible Chat Completions. It does not call the user's local FreeLLMAPI process. The local smoke script targets loopback `http://127.0.0.1:3001` using an Anthropic Messages-compatible `/v1/messages` API. A cloud Supabase Edge Function cannot reach that loopback endpoint on the user's PC.
- The Google AI Studio provider guide documents the supported cloud path: direct HTTPS to Google's OpenAI-compatible endpoint, using a server-side `GEMINI_API_KEY` and `JARVIS_MODEL_PROVIDERS` Supabase Edge Function secrets. The existing local FreeLLMAPI key/configuration is not automatically available to Supabase.
- The configured provider-status route only reports declared configuration; no live authenticated inference was verified during this checkpoint. The previous HTTP 503 therefore remains unresolved, not fixed.
- Current CI evidence remains historical; do not describe the current branch as validated. Supabase log retrieval was unavailable in this checkpoint, so no log-based diagnosis is claimed.

### Next engineering sequence

1. Preserve the zero-cost and two-user privacy boundary. Do not publish or tunnel the local FreeLLMAPI server to the internet.
2. Continue source-level hardening and automated tests for the cloud router and its provider response/SSE parsing without touching production secrets.
3. To activate cloud inference, the account owner must add the Google AI Studio API key as the Supabase Edge Function secret `GEMINI_API_KEY` and the documented `JARVIS_MODEL_PROVIDERS` JSON. This is a credential/billing/privacy boundary and cannot be completed by repository code alone. Before doing so, the owner must confirm the Google project is on the intended free tier and accept the documented Free-tier data-use terms; no paid billing path is authorised.
4. After secret configuration, perform one synthetic low-token authenticated inference and inspect the response. Do not use personal or financial data for the smoke test.
5. Only after successful inference should voice, memory, and then vision work be considered release-ready.

### Critical user-owned dependency

Cloud inference is blocked until the owner configures the two Supabase Edge Function secrets above and confirms the Google AI Studio project's free-tier/data-use settings. No secrets were read, changed, or exposed by this checkpoint.
