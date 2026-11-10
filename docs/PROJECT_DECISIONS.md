# JARVIS project decision ledger

> Durable project decisions. Read this file before changing architecture or asking the user to repeat a decision. Update it when a decision changes; do not silently overwrite history.

## Product invariants

- JARVIS is the one personal assistant, one conversation, and one user-facing command surface.
- BMW/My BMW, Blink, Dreame, and future services are capabilities JARVIS invokes. They are not separate assistants or chat apps.
- The preferred iPhone deliverable is a standalone installable native iOS app with its own icon and lifecycle. However, a cloud-hosted responsive web app/PWA is an explicitly approved fallback and must be treated as a supported, usable release surface if native iOS delivery is blocked, delayed, or impractical. The project must not be held hostage by App Store approval, Xcode availability, signing, or native packaging. The web app must work on desktop and both iPhones with per-user authentication and isolated data.
- Normal JARVIS operation is cloud-first and must not require the Windows PC or a local bridge to be running.
- The holographic HUD belongs to the iPhone JARVIS app. Any optional CarPlay surface is restricted and secondary; it is not the way JARVIS controls My BMW.
- Build the continuous JARVIS conversation first, then progressively enable device integrations through the same assistant.

## Historical decisions from 3 November 2026 (superseded where noted)

### Conversation first
- The first priority was a functional, continuous voice conversation, comparable to ChatGPT Voice. The earlier Dictate Text -> Ask ChatGPT -> Speak Text Shortcut was considered too slow and ended after each request.
- BMW, Home Assistant, and other device integrations were explicitly deferred until the core JARVIS conversation was reliable.
- The intended result is that the user talks to JARVIS once; the assistant remains the single conversational interface.

### Direct integration with My BMW, Blink, and Dreame — clarified 10 November 2026
- The user explicitly clarified that Shortcuts are NOT the target architecture. JARVIS itself must integrate with the vendor services and invoke actions through internal adapters; the user speaks only to JARVIS.
- My BMW: JARVIS should invoke remote cabin climate directly through a BMW integration. First command: "prepara o carro". Do not treat opening the My BMW app or launching a Shortcut as completion.
- Blink: JARVIS should connect to the user's camera account, retrieve camera images/available streams, and show them in the JARVIS interface. Opening Blink alone is not a completed integration.
- Dreame: JARVIS should control the robot vacuum, including room/zone cleaning such as the living room or kitchen when supported by the exact model and map.
- Vendor apps may be needed for initial account authorisation, MFA, permissions, or fallback, but ordinary commands and results belong inside JARVIS.
- Every integration must distinguish requested, accepted, completed, and device-confirmed states. Never report a successful action without a verifiable vendor/device result.
- The previous Shortcut proposal is superseded by this explicit clarification; preserve it as historical context only, not as the implementation plan.

### Blink — historical discovery only
- Earlier exploration identified Blink app actions and `Open Quick View for your Blink`.
- This was not a validated integration and is superseded by the 10 November direct-integration requirement above. Do not implement a Shortcut/Quick View hand-off as the product solution.
- Delivery of camera images/live video into JARVIS was not validated during that earlier exploration.

### Dreame and future services
- Dreame robot vacuum control was planned as a later capability inside JARVIS.
- The exact Dreame model and the supported action route were not captured in the recovered decision record. Do not invent them.
- New services should be added as capabilities to JARVIS, without creating separate assistant interfaces.

## Decision persistence requirement

JARVIS must not rely on the language model's transient conversation window as the only record of project decisions. Maintain:
1. This version-controlled decision ledger as the canonical engineering record.
2. A cloud-backed, user-owned project memory record for the active JARVIS project, with explicit provenance, timestamps, and supersession links.
3. Retrieval of relevant decisions before planning or executing project changes.
4. Explicit confirmation before replacing a durable decision; retain the old decision as superseded history rather than erasing it.
5. Tests proving a new conversation can retrieve the project invariants and the current integration state.

Do not automatically store every conversation or sensitive credential as memory. Store only explicit project decisions and approved facts. Secrets belong in a secret manager, never in this file, chat transcripts, or model context.

## Current implementation status — 10 November 2026

- Cloud auth, conversation storage, streamed text turns, cancellation, and opt-in personal memories exist in the repository/cloud prototype.
- Cloud model routing currently streams text only; it does not yet expose a server-side tool-call/integration execution loop.
- The repository does not yet contain a native Capacitor iOS project, a native authenticated phone action-dispatch channel, or an integration credential manager.
- No direct BMW, Blink, or Dreame adapter is implemented or end-to-end tested yet. The previous Shortcut/Quick View proposal is superseded by the user's 10 November clarification and is not the target implementation.
- The Edge Function already retrieves up to 20 non-expired, user-approved memory records and injects them into the model system context when that user's `context_enabled` preference is true. This is implemented in `supabase/functions/jarvis-api/index.ts` and is not a new task to rebuild.
- The memory preference is deliberately false by default. The current production tables contain zero rows, so no project-decision records are yet available to retrieve; a signed-in user's explicit project-memory seed and opt-in are still required.
- The GitHub Actions CI workflow exists at `.github/workflows/ci.yml` and runs build, tests, lint, and Deno type-check on pushes/PRs. The latest known successful CI run is from an earlier commit; current branch HEAD must be validated before it is considered green.
- Do not claim JARVIS currently remembers this ledger at runtime until the user-owned project records have been seeded and a fresh conversation has verified retrieval.

## Change control

- Work on `work/memory-integration-ready`; do not merge to `main` unless the release gates and tests are green.
- No paid services, production secrets, vendor credentials, personal-data migration, or expanded network exposure without an explicit review of the exact action and cost/security impact.
- Never invent credentials or claim a vendor action succeeded without a verifiable result.

## Update history

- 2026-11-10: Recorded the user's explicit correction that vendor services must be controlled directly by JARVIS; earlier Shortcut/Quick View ideas are historical and superseded.
- 2026-11-10: Reprioritised work to stabilise the cloud conversation, voice, auth, and history before any vendor integrations.
- 2026-11-10: User explicitly confirmed responsive web app/PWA as the guaranteed cross-device fallback if native iOS delivery is not possible; native iOS remains preferred but is not a launch blocker.