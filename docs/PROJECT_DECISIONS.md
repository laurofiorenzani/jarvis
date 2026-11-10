# JARVIS project decision ledger

> Durable project decisions. Read this file before changing architecture or asking the user to repeat a decision. Update it when a decision changes; do not silently overwrite history.

## Product invariants

- JARVIS is the one personal assistant, one conversation, and one user-facing command surface.
- BMW/My BMW, Blink, Dreame, and future services are capabilities JARVIS invokes. They are not separate assistants or chat apps.
- The iPhone deliverable is a standalone installable native iOS app with its own icon and lifecycle, not a Safari bookmark or a PWA as the final product.
- Normal JARVIS operation is cloud-first and must not require the Windows PC or a local bridge to be running.
- The holographic HUD belongs to the iPhone JARVIS app. Any optional CarPlay surface is restricted and secondary; it is not the way JARVIS controls My BMW.
- Build the continuous JARVIS conversation first, then progressively enable device integrations through the same assistant.

## Recovered decisions from 3 November 2026

### Conversation first
- The first priority was a functional, continuous voice conversation, comparable to ChatGPT Voice. The earlier Dictate Text -> Ask ChatGPT -> Speak Text Shortcut was considered too slow and ended after each request.
- BMW, Home Assistant, and other device integrations were explicitly deferred until the core JARVIS conversation was reliable.
- The intended result is that the user talks to JARVIS once; the assistant remains the single conversational interface.

### BMW climate through My BMW Shortcuts
- The user's My BMW app exposed Shortcuts actions: `Start Climate Control`, `Climatize Vehicle Interior`, `Open Doors`, and `Open Trunk`.
- The BMW climate control was confirmed to work when manually activated in My BMW.
- The first planned JARVIS vehicle command was "prepara o carro" and the first controlled action was `Start Climate Control`.
- The agreed route was to invoke the My BMW-provided Shortcut from the JARVIS-triggered iPhone workflow. My BMW supplies the vehicle action; JARVIS remains the assistant the user speaks to.
- This was not yet confirmed end-to-end on the vehicle. Distinguish Shortcut launch/completion from confirmed vehicle climate status.

### Blink
- The user identified Blink Shortcuts/actions for device switch/lights, system arm/disarm, motion detection, notification rules, and `Open Quick View for your Blink`.
- The camera selection was unavailable in the Quick View flow at the time.
- Delivery of the resulting image into JARVIS for analysis was not yet tested. Do not claim a camera image or live video was received merely because Quick View launched.

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
- The repository does not yet contain a native Capacitor iOS project, a native Shortcut invocation adapter, an authenticated phone action-dispatch channel, or an integration credential manager.
- The BMW Shortcut and Blink Quick View flows have not been end-to-end tested from the JARVIS app in the vehicle/home.
- No Dreame control adapter is implemented.
- The Edge Function already retrieves up to 20 non-expired, user-approved memory records and injects them into the model system context when that user's `context_enabled` preference is true. This is implemented in `supabase/functions/jarvis-api/index.ts` and is not a new task to rebuild.
- The memory preference is deliberately false by default. The current production tables contain zero rows, so no project-decision records are yet available to retrieve; a signed-in user's explicit project-memory seed and opt-in are still required.
- The GitHub Actions CI workflow exists at `.github/workflows/ci.yml` and runs build, tests, lint, and Deno type-check on pushes/PRs. The current branch head has no workflow run associated with it yet.
- Do not claim JARVIS currently remembers this ledger at runtime until the user-owned project records have been seeded and a fresh conversation has verified retrieval.

## Change control

- Work on `work/memory-integration-ready`; do not merge to `main` unless the release gates and tests are green.
- No paid services, production secrets, vendor credentials, personal-data migration, or expanded network exposure without an explicit review of the exact action and cost/security impact.
- Never invent credentials or claim a vendor action succeeded without a verifiable result.

## Update history

- 2026-11-10: Recovered and consolidated the previously agreed BMW Shortcuts, Blink Quick View, continuous voice-first, single-assistant, and future Dreame decisions into this durable ledger.