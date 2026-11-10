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

These are repository CI results for an earlier commit only. The latest commits have no associated CI run or commit status yet; do not mark the current branch validated. They also do not establish successful sign-in from the user's device, live model inference, iOS Keychain integration, or production readiness.

## Next safe engineering steps

1. Validate the new cloud-default routing and session auto-restore with the full CI suite; latest commit checks are currently absent.
2. Confirm a live authenticated model inference with a controlled low-token turn, only after confirming server-side provider secrets and free-quota policy. The provider-status endpoint only reports declared configuration, not successful inference.
3. Validate cloud voice input/output, reconnects, conversation history, and error states in a real browser session.
4. Build the standalone iPhone app: add Capacitor 8 dependencies/configuration, generate the native iOS project on macOS/Xcode, add Keychain and native push-to-talk/audio adapters, create the app icon/splash, and test on a physical iPhone. A Safari/PWA shortcut is not an acceptable final deliverable.
5. Implement the separate minimal CarPlay companion UI with Apple's supported templates and apply for the required CarPlay entitlement; approval is a release dependency, not guaranteed.
5. Configure an authorised Supabase Auth account and the production web origin allowlist before hosting the frontend. The UI currently has no account-creation or password-reset flow.
6. Keep production secrets, paid resources, network exposure, and personal-data migration behind separate explicit approval.

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

The conversation-history and resume implementation is present on `work/memory-integration-ready`. Treat the earlier successful CI runs above as historical evidence only; they predate this implementation. The CI workflow is configured for pushes to `work/**` and pull requests. The available commit-run lookup only returns pull-request-triggered runs, so an empty result from that lookup does not prove that no push-triggered run exists. The latest branch head must be checked directly in GitHub Actions before it can be marked validated.
