# JARVIS implementation status — 2026-11-10

This note records what is present in the integration branch and separates code-level evidence from deployment and runtime claims.

## Confirmed in the repository

- The existing local bridge remains the default backend. `src/config.ts` defaults `VITE_BACKEND` to `bridge`.
- The app contains an explicit Cloud Access panel. A successful Supabase password sign-in creates the cloud runtime and selects the cloud brain for the current page session; signing out restores the local brain.
- Cloud authentication uses an injected token store. The current browser panel deliberately uses an in-memory/volatile store, so refresh tokens are not persisted across page reloads.
- The cloud API client supports authenticated conversation creation, listing, retrieval and deletion, plus streamed turns and cancellation.
- The current cloud brain creates a conversation lazily and retains its conversation ID only in the brain instance. It does not restore a previous conversation after a page reload, and the current Cloud Access panel does not provide a conversation-history/resume selector.
- The cloud memory panel supports explicit manual save, list, deletion and an opt-in setting for including approved memories in model context. It is not the same subsystem as the local encrypted-memory bridge.
- The local FreeLLMAPI smoke test targets a loopback endpoint (default `http://127.0.0.1:3001`) and refuses non-loopback endpoints before sending its API key. This validates a local adapter only; it does not prove that the cloud model router is configured or that a live provider call succeeds.
- The cloud provider-status panel reports whether provider configuration is declared and which model names are configured. This is not a live inference test and must not be presented as proof that a provider is reachable or that free-tier quotas are available.
- The encrypted local memory runtime remains disabled by default. Its CI checks do not complete the target-PC, backup/recovery, retention, ACL and production rollout gates documented in `docs/security/MEMORY_INTEGRATION.md`.

## CI evidence

At the time of this note, GitHub Actions run [42704074425](https://github.com/laurofiorenzani/jarvis/actions/runs/42704074425) completed successfully: dependency installation, TypeScript/Vite production build, tests, lint and Supabase Edge Function type-check all passed.

The companion cross-platform test run [42704073993](https://github.com/laurofiorenzani/jarvis/actions/runs/42704073993) completed successfully on Ubuntu and Windows. Both jobs passed `npm ci`, `npm test` and `npm run build`; the disposable Windows Credential Manager diagnostic passed on Windows and was correctly skipped on Ubuntu.

These are repository CI results. They do not establish successful sign-in from the user's device, live model inference, deployed Supabase configuration, iOS Keychain integration, or production readiness.

## Next safe engineering steps

1. Add a cloud conversation-history view and an explicit resume action, using the authenticated list/get endpoints. Keep selection user-controlled; do not silently switch the active conversation.
2. Persist only the active conversation identifier using an explicitly chosen storage policy. Keep the current volatile-token behavior until a reviewed native secure-storage adapter is available.
3. Add tests for resume after reload, switching conversations, empty histories, deleted conversations and expired sessions.
4. Verify the configured provider with a controlled, low-token live inference test only after the correct provider secret and quota policy are confirmed. Never print or commit credentials.
5. Reconcile the README and migration audit with the implemented cloud sign-in panel, volatile token lifecycle, local-only FreeLLMAPI smoke test and still-unverified deployment/runtime gates.

## Safety boundaries

- Do not merge the open memory pull request into `main` as part of this work.
- Do not deploy migrations or Edge Functions, create paid resources, change network exposure, add secrets, or migrate personal data without a separate critical approval.
- Keep local encrypted memory disabled until all release gates pass.
